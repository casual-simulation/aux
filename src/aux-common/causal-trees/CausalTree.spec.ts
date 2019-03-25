import { CausalTree } from "./CausalTree";
import { Atom, AtomId, AtomOp, atomId, atom } from "./Atom";
import { AtomReducer } from "./AtomReducer";
import { Weave } from './Weave';
import { site } from './SiteIdInfo';
import { storedTree, StoredCausalTreeVersion1, StoredCausalTree, StoredCausalTreeVersion2, StoredCausalTreeVersion3, currentFormatVersion } from "./StoredCausalTree";
import { precalculatedOp } from "./PrecalculatedOp";
import { jestPreset } from "ts-jest";

enum OpType {
    root = 0,
    add = 1,
    subtract = 2
}

class Op implements AtomOp {
    type: number;

    constructor(type: OpType = OpType.root) {
        this.type = type;
    }
}

class Reducer implements AtomReducer<Op, number, any> {
    refs: Atom<Op>[];

    eval(weave: Weave<Op>, refs?: Atom<Op>[]): [number, any] {
        this.refs = refs;
        let val = 0;
        for (let i = 0; i < weave.atoms.length; i++) {
            const atom = weave.atoms[i];
            if(atom.value.type === OpType.add) {
                val += 1;
            } else if(atom.value.type === OpType.subtract) {
                val -= 1;
            }
        }
        return [val, null];
    }
}

describe('CausalTree', () => {

    describe('constructor', () => {
        it('should import the given weave', () => {
            let tree1 = new CausalTree(storedTree(site(1)), new Reducer());

            const root = tree1.factory.create(new Op(), null); // Time 1
            tree1.add(root);

            let tree2 = new CausalTree(storedTree(site(2), null, tree1.weave.atoms), new Reducer());

            expect(tree2.weave.atoms.map(r => r)).toEqual([
                root
            ]);
        });

        it('should add the given known sites to the known sites list', () => {
            let tree1 = new CausalTree(storedTree(site(1), [
                site(2),
                site(1)
            ]), new Reducer());

            expect(tree1.knownSites).toEqual([
                { id: 1 },
                { id: 2 }
            ]);
        });
    });

    describe('add()', () => {
        it('should update the factory time when adding an atom from another site', () => {
            let tree = new CausalTree(storedTree(site(1)), new Reducer());

            tree.add(atom(atomId(2, 3), atomId(2, 2), new Op()));

            expect(tree.factory.time).toBe(4);
        });

        it('should update the factory time when adding an atom from this site', () => {
            let tree = new CausalTree(storedTree(site(1)), new Reducer());

            tree.add(atom(atomId(1, 3), atomId(1, 2), new Op()));

            expect(tree.factory.time).toBe(3);
        });

        it('should trigger an event when an atom gets added', () => {
            let tree = new CausalTree(storedTree(site(1)), new Reducer());

            let refs: Atom<Op>[][] = [];
            tree.atomAdded.subscribe(ref => {
                refs.push(ref);
            });

            // no parent so it's skipped
            const skipped = tree.add(atom(atomId(1, 3), atomId(1, 2), new Op()));

            const root = tree.add(atom(atomId(1, 3), null, new Op()));
            const child = tree.add(atom(atomId(1, 4), atomId(1, 3), new Op()));

            expect(refs).toEqual([
                [root],
                [child]
            ]);
        });

        it('should batch multiple updates into one', () => {
            let tree = new CausalTree(storedTree(site(1)), new Reducer());

            let refs: Atom<Op>[][] = [];
            tree.atomAdded.subscribe(ref => {
                refs.push(ref);
            });

            let skipped;
            let root: Atom<Op>;
            let child: Atom<Op>;
            tree.batch(() => {
                // no parent so it's skipped
                skipped = tree.add(atom(atomId(1, 3), atomId(1, 2), new Op()));
                
                root = tree.add(atom(atomId(1, 3), null, new Op()));
                child = tree.add(atom(atomId(1, 4), atomId(1, 3), new Op()));
            });

            expect(refs).toEqual([
                [root, child]
            ]);
        });
    });

    describe('addMany()', () => {
        it('should produce a consistent weave from randomly sorted atoms', () => {
            let tree1 = new CausalTree(storedTree(site(1)), new Reducer());
            let atoms: Atom<Op>[] = [];
            for (let i = 0; i < 1000; i++) {
                let cause = null;
                if (i !== 0) {
                    const random = Math.round(Math.random() * (atoms.length - 1));
                    cause = atoms[random];
                    atoms.push(tree1.factory.create(new Op(), cause.id));
                } else {
                    atoms.push(tree1.factory.create(new Op(), null));
                }
            }

            let tree2 = new CausalTree(storedTree(site(2)), new Reducer());

            for(let i = 0; i < atoms.length; i++) {
                let random = Math.round(Math.random() * (atoms.length - 1));
                let temp = atoms[random];
                atoms[random] = atoms[i];
                atoms[i] = temp;
            }

            const added = tree2.addMany(atoms);

            expect(tree2.weave.isValid()).toBe(true);
            expect(added.length).toBe(atoms.length);
            for(let i = 0; i < atoms.length; i++) {
                expect(added).toContainEqual(atoms[i]);
            }
        });

        it('should produce a consistent weave even if some atoms get dropped', () => {
            let tree1 = new CausalTree(storedTree(site(1)), new Reducer());
            let atoms: Atom<Op>[] = [];
            for (let i = 0; i < 1000; i++) {
                let cause = null;
                if (i !== 0) {
                    const random = Math.round(Math.random() * (atoms.length - 1));
                    cause = atoms[random];
                    atoms.push(tree1.factory.create(new Op(), cause.id));
                } else {
                    atoms.push(tree1.factory.create(new Op(), null));
                }
            }

            let tree2 = new CausalTree(storedTree(site(2)), new Reducer());

            for(let i = 0; i < atoms.length; i++) {
                let random = Math.round(Math.random() * (atoms.length - 1));
                let temp = atoms[random];
                atoms[random] = atoms[i];
                atoms[i] = temp;
            }

            let filtered = atoms.filter(a => (Math.round(Math.random() * 2)) % 2 === 0);

            const added = tree2.addMany(filtered);

            expect(tree2.weave.isValid()).toBe(true);
        });
    });

    describe('value', () => {
        it('should calculate the value using the reducer', () => {
            let tree = new CausalTree(storedTree(site(1)), new Reducer());

            const root = tree.add(tree.factory.create(new Op(), null));
            tree.create(new Op(OpType.add), root);
            tree.create(new Op(OpType.subtract), root);
            tree.create(new Op(OpType.add), root);

            expect(tree.value).toBe(1);
        });
    });

    describe('export()', () => {
        it('should export a stored tree with the current version', () => {
            let tree = new CausalTree(storedTree(site(1)), new Reducer());

            const root =tree.add(tree.factory.create(new Op(), null));
            tree.add(tree.factory.create(new Op(OpType.add), root));
            tree.add(tree.factory.create(new Op(OpType.add), root));
            tree.add(tree.factory.create(new Op(OpType.add), root));

            const exported = tree.export();

            expect(exported.formatVersion).toBe(currentFormatVersion);
        });
    });

    describe('import()', () => {
        describe('version 1', () => {
            it('should be able to import', () => {
                let weave = new Weave<Op>();

                const a1 = weave.insert(atom(atomId(1, 1), null, new Op()));
                const a2 = weave.insert(atom(atomId(1, 2), atomId(1, 1), new Op()));
                const a3 = weave.insert(atom(atomId(1, 3), atomId(1, 1), new Op()));

                let stored: StoredCausalTreeVersion1<Op> = {
                    knownSites: [
                        site(1)
                    ],
                    site: site(1),
                    weave: weave.atoms.map(atom => ({ atom}))
                };

                let tree = new CausalTree(storedTree(site(2)), new Reducer());
                const added = tree.import(stored);

                expect(added).toEqual([
                    a1,
                    a3,
                    a2
                ]);
            });
        });

        describe('version 2', () => {
            it('should be able to import', () => {
                let weave = new Weave<Op>();

                const a1 = weave.insert(atom(atomId(1, 1), null, new Op()));
                const a2 = weave.insert(atom(atomId(1, 2), atomId(1, 1), new Op()));
                const a3 = weave.insert(atom(atomId(1, 3), atomId(1, 1), new Op()));

                let stored: StoredCausalTreeVersion2<Op> = {
                    formatVersion: 2,
                    knownSites: [
                        site(1)
                    ],
                    site: site(1),
                    weave: weave.atoms
                };

                let tree = new CausalTree(storedTree(site(2)), new Reducer());
                const added = tree.import(stored);

                expect(added).toEqual([
                    a1,
                    a3,
                    a2
                ]);
            });
        });

        describe('version 3', () => {
            it('should be able to import', () => {
                let weave = new Weave<Op>();

                const a1 = weave.insert(atom(atomId(1, 1), null, new Op()));
                const a2 = weave.insert(atom(atomId(1, 2), atomId(1, 1), new Op()));
                const a3 = weave.insert(atom(atomId(1, 3), atomId(1, 1), new Op()));

                let stored: StoredCausalTreeVersion3<Op> = {
                    formatVersion: 3,
                    knownSites: [
                        site(1)
                    ],
                    site: site(1),
                    weave: weave.atoms,
                    ordered: true
                };

                let tree = new CausalTree(storedTree(site(2)), new Reducer());
                const added = tree.import(stored);

                expect(added).toEqual([
                    a1,
                    a3,
                    a2
                ]);
            });

            it('should be able to import unordered weaves', () => {
                let weave = new Weave<Op>();

                const a1 = weave.insert(atom(atomId(1, 1), null, new Op()));
                const a2 = weave.insert(atom(atomId(1, 2), atomId(1, 1), new Op()));
                const a3 = weave.insert(atom(atomId(1, 3), atomId(1, 1), new Op()));

                let stored: StoredCausalTreeVersion3<Op> = {
                    formatVersion: 3,
                    knownSites: [
                        site(1)
                    ],
                    site: site(1),
                    weave: [ a3, a1, a2 ],
                    ordered: false
                };

                let tree = new CausalTree(storedTree(site(2)), new Reducer());
                const added = tree.import(stored);

                expect(added).toEqual([
                    a1,
                    a2,
                    a3
                ]);
            });
        });

        it('should ignore unknown versions', () => {
            const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            let weave = new Weave<Op>();

            const a1 = weave.insert(atom(atomId(1, 1), null, new Op()));
            const a2 = weave.insert(atom(atomId(1, 2), atomId(1, 1), new Op()));
            const a3 = weave.insert(atom(atomId(1, 3), atomId(1, 1), new Op()));

            let stored: StoredCausalTree<Op> = <any>{
                formatVersion: 1000,
                knownSites: [
                    site(1)
                ],
                site: site(1),
                weave: weave.atoms.map(atom => ({ atom}))
            };

            let tree = new CausalTree(storedTree(site(2)), new Reducer());
            const added = tree.import(stored);

            expect(added).toEqual([]);

            spy.mockRestore();
        });

        it('should import known sites', () => {
            let tree = new CausalTree(storedTree(site(1)), new Reducer());
            let tree2 = new CausalTree(storedTree(site(2)), new Reducer());

            tree.registerSite(site(3));
            tree.registerSite(site(2));
            tree.registerSite(site(6));
            tree2.import(tree.export());

            expect(tree2.knownSites).toEqual([
                site(2),
                site(1),
                site(3),
                site(6)
            ]);
        });
    });

    describe('importWeave()', () => {
        it('should update the current time based on the given references', () => {
            let tree1 = new CausalTree(storedTree(site(1)), new Reducer());
            let tree2 = new CausalTree(storedTree(site(2)), new Reducer());

            const root = tree1.factory.create(new Op(), null); // Time 1
            tree1.add(root);
            tree2.add(root); // Time 2

            tree2.add(tree2.factory.create(new Op(OpType.add), root)); // Time 3
            tree2.add(tree2.factory.create(new Op(OpType.add), root)); // Time 4
            tree2.add(tree2.factory.create(new Op(OpType.subtract), root)); // Time 5

            tree1.importWeave(tree2.weave.atoms);

            expect(tree1.time).toBe(6);
        });

        it('should update the current time even when importing from the same site', () => {
            let tree1 = new CausalTree(storedTree(site(1)), new Reducer());

            let tree2 = new CausalTree(storedTree(site(1)), new Reducer());

            const root = tree1.factory.create(new Op(), null); // Time 1
            tree1.add(root);
            tree2.add(root); // Time 1

            tree2.add(tree2.factory.create(new Op(OpType.add), root)); // Time 2
            tree2.add(tree2.factory.create(new Op(OpType.add), root)); // Time 3
            tree2.add(tree2.factory.create(new Op(OpType.subtract), root)); // Time 4

            tree1.importWeave(tree2.weave.atoms);

            expect(tree1.time).toBe(4);
        });

        it('should not update the current time when importing duplicates', () => {
            let tree1 = new CausalTree(storedTree(site(1)), new Reducer());
            let tree2 = new CausalTree(storedTree(site(2)), new Reducer());

            const root = tree1.factory.create(new Op(), null); // Time 1
            tree1.add(root);
            tree2.add(root); // Time 2

            tree2.add(tree2.factory.create(new Op(OpType.add), root)); // Time 3
            tree2.add(tree2.factory.create(new Op(OpType.add), root)); // Time 4
            tree2.add(tree2.factory.create(new Op(OpType.subtract), root)); // Time 5

            tree1.importWeave(tree2.weave.atoms);
            tree1.importWeave(tree2.weave.atoms);

            expect(tree1.time).toBe(6);
        });

        it('should only include the atoms that were added to the weave when calculating', () => {
            const reducer = new Reducer();
            let tree1 = new CausalTree(storedTree(site(1)), reducer);
            let tree2 = new CausalTree(storedTree(site(2)), new Reducer());

            const root = tree1.factory.create(new Op(), null);
            tree1.add(root);
            tree2.add(root);

            const add1 = tree2.add(atom(atomId(2, 10), root.id, new Op(OpType.add)));
            const add2 = tree2.add(atom(atomId(2, 11), root.id, new Op(OpType.add)));
            const sub = tree2.add(atom(atomId(2, 12), add2.id, new Op(OpType.subtract)));

            tree2.weave.remove(add2);

            tree1.importWeave([...tree2.weave.atoms, sub]);

            expect(reducer.refs).toEqual([
                add1
            ]);
            expect(tree1.value).toBe(1);
        });

        it('should not import atoms if they are invalid', () => {
            const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            const reducer = new Reducer();
            let tree1 = new CausalTree(storedTree(site(1)), reducer);

            const root = tree1.factory.create(new Op(), null);
            tree1.add(root);

            const add1 = atom(atomId(2, 10), root.id, new Op(OpType.add));
            const add2 = atom(atomId(2, 11), root.id, new Op(OpType.add));
            const sub = atom(atomId(2, 12), add2.id, new Op(OpType.subtract));

            expect(() => {
                tree1.importWeave([root, add1, add2, sub]);
            }).toThrow(/not valid/i);

            spy.mockRestore();
        });
    });

    describe('knownSites', () => {
        it('should default to only our site ID', () => {
            let tree1 = new CausalTree(storedTree(site(1)), new Reducer());

            expect(tree1.knownSites).toEqual([
                { id: 1 }
            ]);
        });
        
        it('should not combine with the weaves known sites', () => {
            let tree1 = new CausalTree(storedTree(site(1)), new Reducer());
            let tree2 = new CausalTree(storedTree(site(2)), new Reducer());

            const root = tree1.factory.create(new Op(), null);
            tree1.add(root);
            tree2.add(root);

            expect(tree2.knownSites).toEqual([
                { id: 2 }
            ]);
        });

        it('should allow adding sites via registerSite()', () => {
            let tree1 = new CausalTree(storedTree(site(1)), new Reducer());

            tree1.registerSite(site(12));

            expect(tree1.knownSites).toEqual([
                { id: 1 },
                { id: 12 }
            ]);
        });

        it('should ignore duplicate sites', () => {
            let tree1 = new CausalTree(storedTree(site(1)), new Reducer());

            tree1.registerSite(site(1));

            expect(tree1.knownSites).toEqual([
                { id: 1 }
            ]);
        });
    });

    describe('createFromPrecalculated()', () => {
        it('should add the given op to the tree', () => {
            let tree1 = new CausalTree(storedTree(site(1)), new Reducer());

            tree1.createFromPrecalculated(precalculatedOp(
                new Op(),
            ));

            expect(tree1.weave.atoms.length).toBe(1);
        });
    });
});