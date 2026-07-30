// ============================================================
// Official syllabus chapter lists, used by the Academic Syllabus
// Generator. Sourced from:
//  - JEE (Main) - 2026 official syllabus (Mathematics/Physics/Chemistry)
//  - NEET (UG) - 2026 official syllabus, NTA/NMC Public Notice 08.01.2026
//
// NOTE: Class 11 / Class 12 (board-only) and Custom Goal are NOT backed
// by an official, verified chapter list here — we deliberately do not
// fabricate one. Selecting those goals completes onboarding with an
// empty chapter set that the user builds out themselves.
// ============================================================

export const JEE_PHYSICS_CHAPTERS: string[] = [
  'Units & Dimensions',
  'Motion in 1D',
  'Motion in 2D',
  'Laws of Motion',
  'Work, Energy & Power',
  'Circular Motion',
  'Centre of Mass',
  'Rotational Motion',
  'Gravitation',
  'Simple Harmonic Motion',
  'Waves',
  'Thermodynamics',
  'Kinetic Theory of Gases',
  'Properties of Solids & Fluids',
  'Electrostatics',
  'Current Electricity',
  'Magnetic Effects & Magnetism',
  'Electromagnetic Induction',
  'Alternating Current',
  'Ray Optics',
  'Wave Optics',
  'Modern Physics (Dual Nature, Atoms & Nuclei)',
  'Semiconductor Electronics',
  'Experimental Physics',
];

export const JEE_MATH_CHAPTERS: string[] = [
  'Sets, Relations & Functions',
  'Complex Numbers & Quadratic Equations',
  'Matrices & Determinants',
  'Permutations & Combinations',
  'Binomial Theorem',
  'Sequence & Series',
  'Limit, Continuity & Differentiability (Calculus)',
  'Integral Calculus',
  'Differential Equations',
  'Coordinate Geometry',
  'Three Dimensional Geometry',
  'Vector Algebra',
  'Statistics & Probability',
  'Trigonometry',
];

export const JEE_CHEMISTRY_CHAPTERS: string[] = [
  // Physical Chemistry
  'Physical: Some Basic Concepts in Chemistry',
  'Physical: Atomic Structure',
  'Physical: Chemical Bonding & Molecular Structure',
  'Physical: Chemical Thermodynamics',
  'Physical: Solutions',
  'Physical: Equilibrium',
  'Physical: Redox Reactions & Electrochemistry',
  'Physical: Chemical Kinetics',
  // Inorganic Chemistry
  'Inorganic: Classification of Elements & Periodicity',
  'Inorganic: p-Block Elements',
  'Inorganic: d- and f-Block Elements',
  'Inorganic: Coordination Compounds',
  // Organic Chemistry
  'Organic: Purification & Characterisation of Organic Compounds',
  'Organic: Basic Principles of Organic Chemistry',
  'Organic: Hydrocarbons',
  'Organic: Compounds Containing Halogens',
  'Organic: Compounds Containing Oxygen',
  'Organic: Compounds Containing Nitrogen',
  'Organic: Biomolecules',
  'Organic: Principles Related to Practical Chemistry',
];

export const NEET_PHYSICS_CHAPTERS: string[] = [
  'Physics and Measurement',
  'Kinematics',
  'Laws of Motion',
  'Work, Energy & Power',
  'Rotational Motion',
  'Gravitation',
  'Properties of Solids & Liquids',
  'Thermodynamics',
  'Kinetic Theory of Gases',
  'Oscillations & Waves',
  'Electrostatics',
  'Current Electricity',
  'Magnetic Effects of Current & Magnetism',
  'Electromagnetic Induction & Alternating Currents',
  'Electromagnetic Waves',
  'Optics',
  'Dual Nature of Matter & Radiation',
  'Atoms & Nuclei',
  'Electronic Devices',
  'Experimental Skills',
];

// NEET chemistry syllabus mirrors the JEE physical/inorganic/organic split
// closely enough (per the official NEET UG-2026 syllabus PDF) to reuse the
// same chapter set.
export const NEET_CHEMISTRY_CHAPTERS: string[] = JEE_CHEMISTRY_CHAPTERS;

export const NEET_BIOLOGY_CHAPTERS: string[] = [
  'Diversity in Living World',
  'Structural Organisation in Animals & Plants',
  'Cell Structure and Function',
  'Plant Physiology',
  'Human Physiology',
  'Reproduction',
  'Genetics and Evolution',
  'Biology and Human Welfare',
  'Biotechnology and Its Applications',
  'Ecology and Environment',
];

export interface SyllabusSeed {
  subjectName: string;
  chapterName: string;
}

/**
 * Returns the seed chapter list for a given academic goal, or an empty
 * array for goals without a verified official syllabus baked in
 * (class_11, class_12, custom) — those start empty by design.
 */
export function getSyllabusSeeds(goal: string): SyllabusSeed[] {
  if (goal === 'jee_main' || goal === 'jee_advanced') {
    return [
      ...JEE_PHYSICS_CHAPTERS.map((c) => ({ subjectName: 'Physics', chapterName: c })),
      ...JEE_CHEMISTRY_CHAPTERS.map((c) => ({ subjectName: 'Chemistry', chapterName: c })),
      ...JEE_MATH_CHAPTERS.map((c) => ({ subjectName: 'Mathematics', chapterName: c })),
    ];
  }
  if (goal === 'neet') {
    return [
      ...NEET_PHYSICS_CHAPTERS.map((c) => ({ subjectName: 'Physics', chapterName: c })),
      ...NEET_CHEMISTRY_CHAPTERS.map((c) => ({ subjectName: 'Chemistry', chapterName: c })),
      ...NEET_BIOLOGY_CHAPTERS.map((c) => ({ subjectName: 'Biology', chapterName: c })),
    ];
  }
  // class_11, class_12, custom — no verified official chapter list; user builds their own.
  return [];
}
