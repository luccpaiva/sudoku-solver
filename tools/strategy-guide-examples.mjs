/**
 * The examples of the strategy guide, docs/STRATEGIES.md, drawn by
 * tools/strategy-guide.mjs. Each is:
 *
 *   id        the picture's file name, and the guide's block for it
 *   strategy  the strategy the step is found with
 *   puzzle    the library puzzle it opens, when not the one named for the strategy
 *   wiki      instead, a position from a sudokuwiki.org article (`bd=` of its link)
 *   start     or a puzzle's 81 characters, opened where the solver first calls on the strategy
 *   source    with `wiki` or `start`: where the position comes from, as the guide says it
 *   pick      a piece of the label of the occurrence to draw (the first one by default)
 */
export const EXAMPLES = [
  // Singles
  { id: 'naked-singles', strategy: 'Naked Singles' },
  { id: 'hidden-singles', strategy: 'Hidden Singles', puzzle: 'Naked Singles' },

  // Intersections
  { id: 'pointing-pairs', strategy: 'Pointing Pairs' },
  { id: 'box-reduction', strategy: 'Box-Reduction' },

  // Locked sets
  { id: 'naked-pairs', strategy: 'Naked Pairs' },
  { id: 'naked-triples', strategy: 'Naked Triples' },
  { id: 'hidden-pairs', strategy: 'Hidden Pairs' },
  { id: 'hidden-triples', strategy: 'Hidden Triples' },
  { id: 'naked-quads', strategy: 'Naked Quads' },
  { id: 'hidden-quads', strategy: 'Hidden Quads' },
  {
    id: 'fireworks-triple',
    strategy: 'Fireworks',
    wiki: 'S9B02037v1n1n080g8i059u067n022v2v0h7q0d2q5u4a3y093y011i0bb60a064q168a03020g049e03360baa050h015u02055y2f2f090d0f1i82072208220b0a7q1ibmb61v1v020d077q010d0b092e2e0f0508',
    source: 'The Triple Firework example of [Fireworks](https://www.sudokuwiki.org/Fireworks) on sudokuwiki.org.',
  },
  {
    id: 'fireworks-quadruple',
    strategy: 'Fireworks',
    start: '002300500010040090000500006076000000800020040900000803000005002000006010000870000',
    source: '"Cobra Roll" by jovi_al, the Quadruple Firework example of [Fireworks](https://www.sudokuwiki.org/Fireworks) on sudokuwiki.org.',
    pick: 'Quadruple',
  },
  {
    id: 'sk-loops',
    strategy: 'SK Loops',
    wiki: '100000002090400050006000700050903000000070000000850040700000600030009080002000001',
    source: 'The Easter Monster, the first example of [SK Loops](https://www.sudokuwiki.org/SK_Loops) on sudokuwiki.org, at its start.',
  },
  {
    id: 'sk-loops-solved-cells',
    strategy: 'SK Loops',
    wiki: 'S9B021y8yc70g8m5e4z048m088q057z8u0b078j0g2201ca028q034yci5i295o071b1c5m095jbq1dbw81068g0g4h4n920798818f08221t1z5e1w038sbu9801560g0a09501s4e07560552041u0g1i4m010i5202',
    source: 'The SK Loop with Solved Cells of [SK Loops](https://www.sudokuwiki.org/SK_Loops) on sudokuwiki.org, after the first four steps of the solve (three Hidden Singles and Pointing Pairs).',
  },
  {
    id: 'twinned-xy-chains',
    strategy: 'Twinned XY-Chains',
    wiki: 'S9B9f0887049i021u923m9o80805y060544800106808g01d2ba4k8g6i7x078t1ubucb03234a0r0508020u1r09071m038r8r5udmcb5f23020h8sak1u011m3o1w03051s3k464g5a391h090l1l1l09140704081u',
    source: 'Nils Leder\'s example, the first of [Twinned XY-Chains](https://www.sudokuwiki.org/Twinned_XY_Chains) on sudokuwiki.org.',
  },
  {
    id: 'aligned-pair-exclusion',
    strategy: 'Aligned Pair Exclusion',
    wiki: 'S9B2b4r2y0r02038i8i5u06022e0509082f2f047v477y070r060502460509080n06022f042f020u017y0705087q060u0706080r7n7r05027z06027n4i070v4713080z2q060304022b099r0v9q024i7n3f6u2v',
    source: 'Example 2 of [Aligned Pair Exclusion](https://www.sudokuwiki.org/Aligned_Pair_Exclusion) on sudokuwiki.org.',
    pick: 'pair C2/C3',
  },
  {
    id: 'aligned-pair-exclusion-unaligned',
    strategy: 'Aligned Pair Exclusion',
    wiki: 'S9B04052e091j3a5w4z512d0p06081b32090z0r9f089e1n023u2y031n9g7sd2058u8w4gc3590604ba0p7r7s480705057s011s07080w8i1o0307051g081g010409b77n020u8e8e064i07b606040782014i0203',
    source: 'Example 5 of [Aligned Pair Exclusion](https://www.sudokuwiki.org/Aligned_Pair_Exclusion) on sudokuwiki.org. Its link gives only the digits; the candidates here are what the basic strategies leave.',
    pick: 'pair B1/C7',
  },

  // Fish
  { id: 'x-wing', strategy: 'X-Wing' },
  { id: 'swordfish', strategy: 'Swordfish' },
  { id: 'jellyfish', strategy: 'Jellyfish' },

  // Wings
  { id: 'y-wing', strategy: 'Y-Wing' },
  { id: 'w-wing', strategy: 'W-Wing' },
  { id: 'xyz-wing', strategy: 'XYZ-Wing' },
  {
    id: 'wxyz-wing',
    strategy: 'WXYZ-Wing',
    wiki: 'S9B0804021u1u0307010936aa0301cy045e4k1g05aa012cd0b84y03048i03081g018k0407057u0216038207010608011u07224q5e020903034i062k3010094q012i6a160903015e4k1g02010908221u031607',
    source: 'Example 2 of [WXYZ-Wing](https://www.sudokuwiki.org/WXYZ_Wing) on sudokuwiki.org.',
  },
  {
    id: 'wxyz-wing-type-2',
    strategy: 'WXYZ-Wing',
    wiki: 'S9B9e019m5w6s0e4a4y03060e080r0r0c020i072i0b03096q4y05560adecy0b06cy040c014ib7030f5v057ncy020dbn049e03cz02cy6a0fbeb6014q0c07064q0b036q054c584y016209026q2i4jc37n62034i',
    source: 'The first Type 2 example of [WXYZ-Wing](https://www.sudokuwiki.org/WXYZ_Wing) on sudokuwiki.org.',
    pick: 'D1/D2/D9/F3',
  },

  // Chains
  { id: 'chute-remote-pairs', strategy: 'Chute Remote Pairs' },
  { id: 'rectangle-elimination', strategy: 'Rectangle Elimination' },
  {
    id: 'simple-colouring',
    strategy: 'Simple Colouring',
    wiki: 'S9B360a0d0c5w2c0i054y3a052g045u09440n4z0o0i080e060a040o0g08062e0i012e050d0b0e0o010h040o070f0i0d2c092c050f0a08030a0h062c090d032c0e2g2e0e012g080f090d0i042g0f2e0e442b43',
    source: 'The Rule 4 example of [Simple Colouring](https://www.sudokuwiki.org/Simple_Colouring) on sudokuwiki.org.',
  },
  {
    id: 'simple-colouring-rule-2',
    strategy: 'Simple Colouring',
    wiki: 'S9B2b0i0f0e0d0b5v035v2j0r020h090c050f2b0e080c070a060b0i04090g430b05040c43064a030e0a0f0i4a070b060b0r03080g0r0e090316be060g01b6024i430z070i024i060d0c0b06b60d0c4icz436b',
    source: 'The Rule 2 example of [Simple Colouring](https://www.sudokuwiki.org/Simple_Colouring) on sudokuwiki.org.',
    pick: 'twice in',
  },
  {
    id: 'simple-colouring-rule-7',
    strategy: 'Simple Colouring',
    wiki: 'S9Bccbgc4077qc605bd7p03b8ck50820104b8070g01bo4c8ebaba067o8s9s8o01080eaa9o8s055u4z090b0d6r5v03bhbgb90c0607b7bh0eb706bb4a0gba02057v7p7s07057z8m8n7z08b70e044y7r02af9j8j',
    source: 'The Rule 7 example of [Simple Colouring](https://www.sudokuwiki.org/Simple_Colouring) on sudokuwiki.org.',
    pick: 'empty',
  },
  {
    id: 'x-cycles-rule-1',
    strategy: 'X-Cycles',
    wiki: 'S9B4a0f030e0b4a010i0g054b0i06074f0b4a0u074b0b434e094e0e060a0304070i05060b0h0f0i0e0b46462i2i0a0b0g08040a0609030e090e36035663626z020u4a36430502663f094e0b010i5662056y0u',
    source: 'Figure 4 of [X-Cycles](https://www.sudokuwiki.org/X_Cycles) on sudokuwiki.org.',
    pick: 'A1=A6-C4',
  },
  {
    id: 'x-cycles-rule-2',
    strategy: 'X-Cycles',
    wiki: 'S9B09070u0a0e0u06020h0a0b050u0h06077u7y0h0u0f02090g0n050v1q0u0g051i0b7n087n1i010b0i040h0e071i0e080i0g1i010b0u1q0u090u0f02050h0a0g0b0f01080g7q047q0e0g05080u0a7y7q0602',
    source: 'Figure 1 of [X-Cycles, part 2](https://www.sudokuwiki.org/X_Cycles_Part_2) on sudokuwiki.org.',
    pick: 'B4=B9-C7',
  },
  {
    id: 'x-cycles-rule-3',
    strategy: 'X-Cycles',
    wiki: 'S9B01054a44090g0s030f0f070u15120p090h0s0i0b46460604010g0e0304020i0g0h060e0a0h0i0a1u121k0g0d0o0e0f070p0d0p0o09080d0c0607020e0h0a0i0g0a091q0h1i0e020u0b080e0u010i0u0607',
    source: 'Figure 3 of [X-Cycles, part 2](https://www.sudokuwiki.org/X_Cycles_Part_2) on sudokuwiki.org.',
    pick: 'B4|C4',
  },
  {
    id: 'xy-chain',
    strategy: 'XY-Chain',
    wiki: 'S9B1g0818017o038207222e0i0s0e2c0f430r4e2e1u01049e0886021y05070h0b0d010f03090a0d0c060e090g0h0b09020f080c0g0d05014y030g091f05020r4a501u100c1f0d430i0g0d010i070h02120612',
    source: 'Example 1 of [XY-Chains](https://www.sudokuwiki.org/XY_Chains) on sudokuwiki.org.',
    pick: '(5=9)A7',
  },
  {
    id: 'xy-chain-closed',
    strategy: 'XY-Chain',
    wiki: 'S9B022y0i1a3q3q08011i0f012i4e66092e050b082q030z3n02360d090z095w4o6g041j0o1i0d2g060p9l2f057s080z0o4406bs4m7n070d030f0r09170z020h070i0s0l074f470u060e0g08050w1s1i7y7q01',
    source: 'The first closed chain example of [XY-Chains](https://www.sudokuwiki.org/XY_Chains) on sudokuwiki.org.',
    pick: '(4=7)B3',
  },
  {
    id: 'medusa-rule-1',
    strategy: '3D Medusa',
    wiki: 'S9B2b0903080b04050f2b2j0h05067q0n7u2f0b020r067r070e7u0n0h0c020a0g060i0h040e8i1m7u020e080c2b2b0e070h0n040n0b090f0h0e7u7u010f070b030r0v0g7y0h02060e7u8i1q02057q0701087u',
    source: 'The Rule 1 example of [3D Medusa](https://www.sudokuwiki.org/3D_Medusa) on sudokuwiki.org.',
  },
  {
    id: 'medusa-rule-6',
    strategy: '3D Medusa',
    wiki: 'S9B0f4m4j04b77q4i0g02440d09440g0501030f4p4o0g45060o0d094i7t070l0f05087o0d7r4o4o067n7n0d074k4mbn4i0d03020gbm06bn4k094k4k040f0c0a0g0d010307b67o064k82070f4kbo0c01b84404',
    source: 'The Rule 6 example of [3D Medusa](https://www.sudokuwiki.org/3D_Medusa) on sudokuwiki.org.',
  },
  {
    id: 'medusa-rule-5',
    strategy: '3D Medusa',
    wiki: 'S9B8j03074y0443020eb6088a8y3m9e02010c7u7p8d844ib70c0f0gbe047o0a5u5u060e7o030g060c020e090d080a050h7o010c0d0g7o068i9u8y0d4y6a0c0a0b1h2d08031h2b0i0d050c11040i0l0z080607',
    source: 'The Rule 5 example of [3D Medusa](https://www.sudokuwiki.org/3D_Medusa) on sudokuwiki.org.',
  },

  // Deadly patterns
  { id: 'bug-plus-one', strategy: 'BUG+1' },
  { id: 'unique-rectangles', strategy: 'Unique Rectangles' },
  {
    id: 'unique-rectangle-guardians-type-2',
    strategy: 'Unique Rectangle Guardians',
    wiki: 'S9B0d022r0i2r2r0c0h0f1306130b4n4j070904082e090u062i020e0a070r4z56be037n0b0e09164i0162020f2i030b0v1j059mai7n2i080n7r044602b6050f070608020g0z0z0d030i129u2q1q7y8q0h010b',
    source: 'The Type 2 example of [Unique Rectangles](https://www.sudokuwiki.org/Unique_Rectangles) on sudokuwiki.org.',
  },
  {
    id: 'unique-rectangle-guardians-type-2d',
    strategy: 'Unique Rectangle Guardians',
    wiki: 'S9B2i0h10391p1o2s030i060a102c09032y0h2y032i0i08050s2c0a060h060a140o070904100i0c041w1g0h012q2s0b0507090r0r0h060c017u1i1k07051q7o082q9e1i04088k3q9w012y020h1j1j8j3y9u2y',
    source: 'The Type 2D example of [Unique Rectangles](https://www.sudokuwiki.org/Unique_Rectangles) on sudokuwiki.org.',
  },
  {
    id: 'unique-rectangle-guardians-type-3',
    strategy: 'Unique Rectangle Guardians',
    wiki: 'S9B8i8i45050l03040743052e0l082d047r067q042e432b09064705020805070p0n09060l040302040643070509437n7n060s4a054403070208052e06019i047q371f092m2m082h0l052b04030905022b0806',
    source: 'The Type 3 example of [Unique Rectangles](https://www.sudokuwiki.org/Unique_Rectangles) on sudokuwiki.org.',
    pick: 'set with J7',
  },
  {
    id: 'unique-rectangle-guardians-type-4',
    strategy: 'Unique Rectangle Guardians',
    wiki: 'S9B0d032s3o0937435u5x10432s462s47060i04094306642c6303052d14061001087o070d7q46090a3604360e0246440g047o0305b6010f0a04087q367q023605071003181w4c7n4y7n0f100i6c015w0d035u',
    source: 'The Type 4 example of [Unique Rectangles](https://www.sudokuwiki.org/Unique_Rectangles) on sudokuwiki.org.',
  },
  {
    id: 'unique-rectangle-guardians-type-5',
    strategy: 'Unique Rectangle Guardians',
    wiki: 'S9B07bmbq0484064448017u028m089f2b3e3a05015m5e0c2s2c70093g038j049g2d056s6s38b8071u7o034422011m440z11062l65032s097w039h0e3g2k7n380805b7d12c6s037n0438064a5w0164092s2s03',
    source: 'The Type 5 example of [Unique Rectangles](https://www.sudokuwiki.org/Unique_Rectangles) on sudokuwiki.org.',
  },
  {
    id: 'avoidable-rectangles',
    strategy: 'Avoidable Rectangles',
    wiki: 'S9B1u2b040i2q021v03084i2b02066e2e17170903095e044i0a071w10900301082c9e1u1w04901g3m130d7q4j5h2t04446a0z0l0603092t444c090n0n054a0706011m1i0g0i08021612070546020f0d09430n',
    source: 'The example of [Avoidable Rectangles](https://www.sudokuwiki.org/Avoidable_Rectangles) on sudokuwiki.org, found by Frisbee.',
  },
  {
    id: 'tridagons',
    strategy: 'Tridagons',
    wiki: 'S9B0102cycy03040eb60f05cy0302b6069nbfd7cy06040105cy9g0cb8cy0102cy040c0605cy04cy0506b60103b8d00603b6de02de9nbfd7bcbmb70407bo7p06899ga2ab031f84087x8dbcbuc3bm1fbo7x078h',
    source: 'The first Type 1 example of [Tridagons](https://www.sudokuwiki.org/Tridagons) on sudokuwiki.org, the classic from Phil\'s Folly.',
  },
  {
    id: 'tridagons-type-2',
    strategy: 'Tridagons',
    wiki: 'S9B0102034q4q5m074y09228a220g438i0203436qb66q020n8m1f04050b0c4q4q0701bubm064q010906024u4q074e364q36094u4u4r4l4h0c4q014q092c5m5g644q070203064qbvbn4b09064q0a4q2c034k64',
    source: 'The Type 2 example (a pointing pair of guardians) of [Tridagons](https://www.sudokuwiki.org/Tridagons) on sudokuwiki.org.',
  },
  {
    id: 'tridagons-type-3',
    strategy: 'Tridagons',
    wiki: 'S9B09080706050t0s0u0v04101v03cyd19gaaab1h0o1j9m9m9p0805aj039m0205069m01089m6q9mc201d646059q0b6ba24j9m02da9m3aam5u06be02019m039m052q018a9m030f9m020h2c9k7y089m0e06019m',
    source: 'The Type 3A example in a row (a locked pseudo pair) of [Tridagons](https://www.sudokuwiki.org/Tridagons) on sudokuwiki.org.',
  },
  {
    id: 'extended-rectangles-type-1',
    strategy: 'Extended Rectangles',
    wiki: '907024305842365917030907400004009600000246009009000040000492876796050234428673591',
    source: 'The first Type 1 example of [Extended Unique Rectangles](https://www.sudokuwiki.org/Extended_Unique_Rectangles) on sudokuwiki.org, with the candidates rebuilt from its values.',
  },
  {
    id: 'extended-rectangles-type-2',
    strategy: 'Extended Rectangles',
    wiki: 'S9B010h167u070f7o84030w0w0g8e138206087v091q26020n082b2r0r4y054y0g0b04037n7n0u0u02080901050f0g0g0i010612124404441s1s5a014y07bg7s055c0709124y140r0p44050a467q047s5w2g06',
    source: 'The Type 2 example of [Extended Unique Rectangles](https://www.sudokuwiki.org/Extended_Unique_Rectangles) on sudokuwiki.org.',
  },
  {
    id: 'extended-rectangles-type-4',
    strategy: 'Extended Rectangles',
    wiki: 'S9B7q01074q06b6028abq0204b601bm03bm07060546064a0207ba7u0107090u060r0213081201050246bab607060408060u070r057r027q0407bm4m4m06bm010206024i094i010403077q46010207040682bm',
    source: 'Pieter\'s Type 4 example of [Extended Unique Rectangles](https://www.sudokuwiki.org/Extended_Unique_Rectangles) on sudokuwiki.org, after the naked pair and naked triple its link leaves to do.',
  },
  {
    id: 'hidden-rectangles-type-1',
    strategy: 'Hidden Rectangles',
    wiki: 'S9B040f032b082q83830b0i070b060n124j04430e434302090d0c060g010o827u0w0818070f0744827v0f7o4t4j0354044y052h2g454309480563da2k06czbb4b52096y660e015u024a484963da2k9g06bb05',
    source: 'The Type 1 example of [Hidden Unique Rectangles](https://www.sudokuwiki.org/Hidden_Unique_Rectangles) on sudokuwiki.org.',
    pick: 'Type 1',
  },
  {
    id: 'hidden-rectangles-type-2',
    strategy: 'Hidden Rectangles',
    wiki: 'S9B040f032b082q83830b0i070b060n124j04430e434302090d0c060g010o827u0w0818070f0744827v0f7o4t4j0354044y052h2g454309480563da2k06czbb4b1i096y660e015u024a484963da2k9g06bb05',
    source: 'The Type 2 example of [Hidden Unique Rectangles](https://www.sudokuwiki.org/Hidden_Unique_Rectangles) on sudokuwiki.org.',
  },
  {
    id: 'hidden-rectangles-type-2b',
    strategy: 'Hidden Rectangles',
    wiki: '020580030350000084086700020048090156500608040963050278090065810600800092830000060',
    source: 'The first Type 2b example of [Hidden Unique Rectangles](https://www.sudokuwiki.org/Hidden_Unique_Rectangles) on sudokuwiki.org, with the candidates rebuilt from its values.',
  },
]
