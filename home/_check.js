
    const CATS = [
  {
    "id": "product",
    "name": "Product & Strategy"
  },
  {
    "id": "arch",
    "name": "Architecture & Implementation (Non-Engineering)"
  },
  {
    "id": "eval",
    "name": "Evaluation, QA & Safety"
  },
  {
    "id": "ops",
    "name": "Ops, Delivery & Program"
  },
  {
    "id": "ux",
    "name": "UX & Human-AI"
  },
  {
    "id": "analysis",
    "name": "Analysis & Decision Systems"
  },
  {
    "id": "weird",
    "name": "Title-Weird but Real"
  }
];
const ROLES = [
  {
    "id": "ai-product-owner",
    "category": "product",
    "title": "AI Product Ownership & Direction",
    "oneLiner": "Owns AI-powered features end-to-end, tied to outcomes.",
    "tags": [
      "Ownership",
      "Outcomes",
      "Constraints",
      "Trust",
      "Systems"
    ],
    "focus": "Own AI use cases tied to business value; prioritize tradeoffs; align stakeholders, design, and engineering.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "Own AI use cases tied to business value; prioritize tradeoffs; align stakeholders, design, and engineering.",
      "angle": [
        "System/outcome-first thinking (not feature churn).",
        "Failure-mode driven planning to protect trust.",
        "Translate ambiguity into executable direction."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  },
  {
    "id": "ai-pm",
    "category": "product",
    "title": "AI Product Manager",
    "oneLiner": "Own applied AI outcomes end-to-end \u2014 not demos.",
    "tags": [
      "Systems",
      "Decision",
      "Risk",
      "Delivery",
      "Trust"
    ],
    "focus": "Define AI behavior and constraints, pressure-test outputs, iterate fast with AI-assisted prototyping.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "Define AI behavior and constraints, pressure-test outputs, iterate fast with AI-assisted prototyping.",
      "angle": [
        "Behavior contracts + recovery-first UX.",
        "Fast iteration with guardrails.",
        "Clear tradeoffs grounded in reality."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  },
  {
    "id": "applied-ai-pm",
    "category": "product",
    "title": "Applied AI Product Manager",
    "oneLiner": "Embedding AI into real workflows without breaking trust.",
    "tags": [
      "Workflows",
      "Adoption",
      "Automation",
      "Control",
      "Trust"
    ],
    "focus": "Turn AI capabilities into usable products, balance automation vs human control, and ship fast without breaking trust.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "Turn AI capabilities into usable products, balance automation vs human control, and ship fast without breaking trust.",
      "angle": [
        "Applied > theoretical AI approach.",
        "Pressure-test demos against real usage.",
        "Design for adoption, not novelty."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  },
  {
    "id": "ai-product-lead",
    "category": "product",
    "title": "AI Product Lead",
    "oneLiner": "Senior ownership across multiple AI initiatives.",
    "tags": [
      "Portfolio",
      "Standards",
      "Coaching",
      "Reliability",
      "Strategy"
    ],
    "focus": "Set product direction and standards, coach PMs and partners, ensure consistency and reliability across AI systems.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "Set product direction and standards, coach PMs and partners, ensure consistency and reliability across AI systems.",
      "angle": [
        "Portfolio-level thinking.",
        "Spot systemic risk early.",
        "Add structure without slowing teams down."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  },
  {
    "id": "ai-product-strategist",
    "category": "product",
    "title": "AI Product Strategist",
    "oneLiner": "Defines why and where AI should exist in product.",
    "tags": [
      "Strategy",
      "ROI",
      "Feasibility",
      "Risk",
      "Roadmap"
    ],
    "focus": "Identify high-leverage AI opportunities, evaluate ROI/risk/feasibility, and shape long-term AI roadmaps.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "Identify high-leverage AI opportunities, evaluate ROI/risk/feasibility, and shape long-term AI roadmaps.",
      "angle": [
        "Strategic decomposition.",
        "Second-order effects thinking.",
        "Connect business intent to system behavior."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  },
  {
    "id": "ai-platform-pm",
    "category": "product",
    "title": "AI Platform Product Manager",
    "oneLiner": "Own shared AI platforms/tools/internal capabilities.",
    "tags": [
      "Platform",
      "Enablement",
      "Interfaces",
      "Guardrails",
      "Consistency"
    ],
    "focus": "Own platform usability for internal teams, reliability of AI services, and cross-team enablement.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "Own platform usability for internal teams, reliability of AI services, and cross-team enablement.",
      "angle": [
        "Design for reuse and clarity.",
        "Think in contracts/interfaces/guardrails.",
        "Deep empathy for internal customers."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  },
  {
    "id": "ai-systems-designer",
    "category": "product",
    "title": "AI Systems Designer",
    "oneLiner": "Designs how AI systems behave holistically.",
    "tags": [
      "System Flows",
      "States",
      "Recovery",
      "Explainability",
      "Predictability"
    ],
    "focus": "Define system flows/states, handle errors/edge cases/recovery, and ensure explainability and predictability.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "Define system flows/states, handle errors/edge cases/recovery, and ensure explainability and predictability.",
      "angle": [
        "Systems thinking as core strength.",
        "Design behavior, not just UI.",
        "Treat AI as part of a larger organism."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  },
  {
    "id": "ai-solutions-architect",
    "category": "arch",
    "title": "AI Solutions Architect (Non-Engineering)",
    "oneLiner": "Designs end-to-end AI solutions without owning code.",
    "tags": [
      "Architecture",
      "Tradeoffs",
      "Stakeholders",
      "Direction",
      "Risk"
    ],
    "focus": "Design solution options and tradeoffs, communicate with stakeholders, translate needs into technical direction.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "Design solution options and tradeoffs, communicate with stakeholders, translate needs into technical direction.",
      "angle": [
        "Full-system view.",
        "Fluent across technical/non-technical contexts.",
        "Reduce implementation risk before build starts."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  },
  {
    "id": "applied-ai-architect",
    "category": "arch",
    "title": "Applied AI Architect",
    "oneLiner": "Architects practical AI workflows and integrations.",
    "tags": [
      "Pipelines",
      "Handoffs",
      "Practicality",
      "Constraints",
      "Integration"
    ],
    "focus": "Design pipelines/handoffs, select appropriate approaches, avoid overengineering.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "Design pipelines/handoffs, select appropriate approaches, avoid overengineering.",
      "angle": [
        "Optimize for practicality.",
        "Focus on 'will this actually work?'.",
        "Design with constraints in mind."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  },
  {
    "id": "ai-implementation-lead",
    "category": "arch",
    "title": "AI Implementation Lead",
    "oneLiner": "Owns execution of AI solutions across teams.",
    "tags": [
      "Execution",
      "Rollout",
      "Adoption",
      "Coordination",
      "Scope"
    ],
    "focus": "Coordinate delivery, manage rollout/adoption, ensure systems behave as intended.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "Coordinate delivery, manage rollout/adoption, ensure systems behave as intended.",
      "angle": [
        "Bridge plan \u2192 reality.",
        "Anticipate integration pain.",
        "Keep scope grounded."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  },
  {
    "id": "ai-integration-specialist",
    "category": "arch",
    "title": "AI Integration Specialist",
    "oneLiner": "Ensures AI integrates cleanly with existing tools.",
    "tags": [
      "APIs",
      "Workflow Mapping",
      "Reliability",
      "Seams",
      "Handoffs"
    ],
    "focus": "Map workflows, coordinate tools/APIs, and harden reliability at integration points.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "Map workflows, coordinate tools/APIs, and harden reliability at integration points.",
      "angle": [
        "Obsess over seams and handoffs.",
        "Catch edge cases others miss.",
        "Think in flows, not silos."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  },
  {
    "id": "enterprise-ai-consultant",
    "category": "arch",
    "title": "Enterprise AI Consultant",
    "oneLiner": "Advises orgs on AI adoption and strategy.",
    "tags": [
      "Readiness",
      "Rollouts",
      "Education",
      "Change Mgmt",
      "Pragmatism"
    ],
    "focus": "Assess readiness, design phased rollouts, educate stakeholders.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "Assess readiness, design phased rollouts, educate stakeholders.",
      "angle": [
        "Translate hype into action.",
        "Credible with tech + business leaders.",
        "Focus on sustainable adoption."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  },
  {
    "id": "applied-ai-consultant",
    "category": "arch",
    "title": "Applied AI Consultant",
    "oneLiner": "Hands-on prototyping + validation for real use.",
    "tags": [
      "Prototyping",
      "Validation",
      "Risk",
      "Humans",
      "Speed"
    ],
    "focus": "Rapid prototype, validate use cases, identify risk.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "Rapid prototype, validate use cases, identify risk.",
      "angle": [
        "Move fast without breaking trust.",
        "Test assumptions aggressively.",
        "Design with humans in mind."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  },
  {
    "id": "ai-qa-specialist",
    "category": "eval",
    "title": "AI QA Specialist",
    "oneLiner": "Tests AI systems for correctness and reliability.",
    "tags": [
      "Testing",
      "Failure Patterns",
      "Regression",
      "Adversarial",
      "Reliability"
    ],
    "focus": "Design test cases, identify failure patterns, and report actionable issues.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "Design test cases, identify failure patterns, and report actionable issues.",
      "angle": [
        "Think adversarially.",
        "Enjoy breaking systems.",
        "Care deeply about reliability."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  },
  {
    "id": "ai-model-eval",
    "category": "eval",
    "title": "AI Model Evaluation Specialist",
    "oneLiner": "Evaluates outputs against defined standards.",
    "tags": [
      "Criteria",
      "Drift",
      "Metrics",
      "Judgment",
      "Quality"
    ],
    "focus": "Create evaluation criteria, measure quality/drift, feed insights back into design.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "Create evaluation criteria, measure quality/drift, feed insights back into design.",
      "angle": [
        "Systematic and precise.",
        "Spot subtle degradation.",
        "Balance metrics with human judgment."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  },
  {
    "id": "ai-eval-lead",
    "category": "eval",
    "title": "AI Evaluation Lead",
    "oneLiner": "Own evaluation frameworks across teams.",
    "tags": [
      "Standards",
      "Process",
      "Consistency",
      "Rigor",
      "Org"
    ],
    "focus": "Set evaluation standards, coordinate review, ensure consistency.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "Set evaluation standards, coordinate review, ensure consistency.",
      "angle": [
        "Design repeatable systems.",
        "Rigor without bureaucracy.",
        "Elevate quality org-wide."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  },
  {
    "id": "ai-safety-analyst",
    "category": "eval",
    "title": "AI Safety Analyst",
    "oneLiner": "Identifies and mitigates AI risks.",
    "tags": [
      "Risk",
      "Scenarios",
      "Misuse",
      "Policy",
      "Safety"
    ],
    "focus": "Risk assessment, scenario analysis, policy alignment.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "Risk assessment, scenario analysis, policy alignment.",
      "angle": [
        "Think in worst cases.",
        "Anticipate misuse.",
        "Balance safety with usability."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  },
  {
    "id": "responsible-ai",
    "category": "eval",
    "title": "Responsible AI Specialist",
    "oneLiner": "Pragmatic ethics + compliance for AI.",
    "tags": [
      "Bias",
      "Fairness",
      "Transparency",
      "Compliance",
      "Guardrails"
    ],
    "focus": "Bias/fairness reviews, transparency guidance, compliance collaboration.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "Bias/fairness reviews, transparency guidance, compliance collaboration.",
      "angle": [
        "Ethics pragmatically.",
        "Design guardrails, not blockers.",
        "Think long-term."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  },
  {
    "id": "ai-reliability-analyst",
    "category": "eval",
    "title": "AI Risk & Reliability Analyst",
    "oneLiner": "Monitors stability over time and learns from incidents.",
    "tags": [
      "Drift",
      "Reliability",
      "Incidents",
      "Trends",
      "Learning"
    ],
    "focus": "Drift detection, reliability analysis, incident review.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "Drift detection, reliability analysis, incident review.",
      "angle": [
        "Track patterns, not noise.",
        "Learn from failures.",
        "Improve systems iteratively."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  },
  {
    "id": "ai-ops-analyst",
    "category": "ops",
    "title": "AI Operations Analyst",
    "oneLiner": "Keeps AI systems running smoothly post-launch.",
    "tags": [
      "Monitoring",
      "Lifecycle",
      "Updates",
      "Support",
      "Ops"
    ],
    "focus": "Monitor performance, manage updates, support teams.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "Monitor performance, manage updates, support teams.",
      "angle": [
        "Operational excellence mindset.",
        "Catch small issues early.",
        "Lifecycle thinking."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  },
  {
    "id": "llm-ops",
    "category": "ops",
    "title": "LLM Operations Analyst",
    "oneLiner": "Stability: prompts, versions, and change control.",
    "tags": [
      "Ops",
      "Versioning",
      "Stability",
      "Monitoring",
      "Change Control"
    ],
    "focus": "Prompt/version management, output consistency, change impact analysis.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "Prompt/version management, output consistency, change impact analysis.",
      "angle": [
        "Understand LLM quirks.",
        "Design for stability.",
        "Respect real-world usage."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  },
  {
    "id": "ai-program-manager",
    "category": "ops",
    "title": "AI Program Manager",
    "oneLiner": "Coordinates multiple AI initiatives.",
    "tags": [
      "Planning",
      "Dependencies",
      "Risk Tracking",
      "Alignment",
      "Execution"
    ],
    "focus": "Plan/execution, dependency management, risk tracking.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "Plan/execution, dependency management, risk tracking.",
      "angle": [
        "Bring order to complexity.",
        "Communicate clearly.",
        "Keep teams aligned."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  },
  {
    "id": "ai-tpm",
    "category": "ops",
    "title": "Technical Program Manager (AI / ML)",
    "oneLiner": "TPM for AI teams: delivery + technical risk.",
    "tags": [
      "Timelines",
      "Coordination",
      "Blockers",
      "Technical Risk",
      "Momentum"
    ],
    "focus": "Delivery timelines, cross-team coordination, technical risk awareness.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "Delivery timelines, cross-team coordination, technical risk awareness.",
      "angle": [
        "Speak technical + business.",
        "Foresee delivery blockers.",
        "Keep momentum high."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  },
  {
    "id": "ai-delivery-manager",
    "category": "ops",
    "title": "AI Delivery Manager",
    "oneLiner": "Ensures AI projects ship successfully.",
    "tags": [
      "Execution",
      "Stakeholders",
      "Outcomes",
      "Shipping",
      "Loops"
    ],
    "focus": "Execution oversight, stakeholder updates, outcome tracking.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "Execution oversight, stakeholder updates, outcome tracking.",
      "angle": [
        "Outcome-driven.",
        "Hold clarity under pressure.",
        "Close loops."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  },
  {
    "id": "conversational-designer",
    "category": "ux",
    "title": "Conversational Designer",
    "oneLiner": "Designs AI conversations that feel natural and trustworthy.",
    "tags": [
      "Conversation",
      "Recovery",
      "Tone",
      "Clarity",
      "Flows"
    ],
    "focus": "Conversation flows, error recovery, tone and clarity.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "Conversation flows, error recovery, tone and clarity.",
      "angle": [
        "Humans first.",
        "Handle ambiguity gracefully.",
        "Reduce frustration."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  },
  {
    "id": "ai-interaction-designer",
    "category": "ux",
    "title": "AI Interaction Designer",
    "oneLiner": "Designs how users interact with AI systems.",
    "tags": [
      "Patterns",
      "Feedback",
      "Explainability",
      "UX",
      "Controls"
    ],
    "focus": "Interaction patterns, feedback mechanisms, explainability.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "Interaction patterns, feedback mechanisms, explainability.",
      "angle": [
        "Think beyond screens.",
        "Design for understanding.",
        "Focus on usability."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  },
  {
    "id": "ai-ux-designer",
    "category": "ux",
    "title": "AI UX Designer",
    "oneLiner": "Owns UX of AI-driven features.",
    "tags": [
      "Research",
      "Iteration",
      "Testing",
      "Trust",
      "Usability"
    ],
    "focus": "User research, experience design, iteration/testing.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "User research, experience design, iteration/testing.",
      "angle": [
        "Trust + clarity obsession.",
        "Design for edge cases.",
        "Balance power with simplicity."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  },
  {
    "id": "human-ai-xd",
    "category": "ux",
    "title": "Human-AI Experience Designer",
    "oneLiner": "Holistic human-AI relationship design.",
    "tags": [
      "Trust",
      "Transparency",
      "Engagement",
      "Long-term",
      "Confidence"
    ],
    "focus": "Trust-building, transparency, long-term engagement.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "Trust-building, transparency, long-term engagement.",
      "angle": [
        "Think emotionally + systemically.",
        "Design for confidence, not magic.",
        "Prioritize understanding."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  },
  {
    "id": "ai-content-systems",
    "category": "ux",
    "title": "AI Content Systems Designer",
    "oneLiner": "Designs how AI generates and manages content.",
    "tags": [
      "Content Rules",
      "Consistency",
      "Quality Control",
      "Voice",
      "Structure"
    ],
    "focus": "Content rules/structure, quality control, consistency.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "Content rules/structure, quality control, consistency.",
      "angle": [
        "Repeatable behavior.",
        "Prevent chaos at scale.",
        "Care about voice/tone."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  },
  {
    "id": "ai-product-analyst",
    "category": "analysis",
    "title": "AI Product Analyst",
    "oneLiner": "Analyzes AI product performance for impact.",
    "tags": [
      "Metrics",
      "Insights",
      "Performance",
      "Impact",
      "Recommendations"
    ],
    "focus": "Metrics/insights, performance analysis, recommendation building.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "Metrics/insights, performance analysis, recommendation building.",
      "angle": [
        "Connect data to decisions.",
        "Ask the right questions.",
        "Focus on impact."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  },
  {
    "id": "ai-biz-systems-analyst",
    "category": "analysis",
    "title": "AI Business Systems Analyst",
    "oneLiner": "Aligns AI systems with business processes.",
    "tags": [
      "Workflows",
      "Requirements",
      "Alignment",
      "Operations",
      "Friction"
    ],
    "focus": "Workflow analysis, requirement translation, stakeholder alignment.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "Workflow analysis, requirement translation, stakeholder alignment.",
      "angle": [
        "Understand operations deeply.",
        "Translate across domains.",
        "Reduce friction."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  },
  {
    "id": "ai-decision-systems",
    "category": "analysis",
    "title": "AI Decision Systems Analyst",
    "oneLiner": "Designs/evaluates AI-driven decisions with accountability.",
    "tags": [
      "Decision Logic",
      "Risk",
      "Outcomes",
      "Accountability",
      "Tradeoffs"
    ],
    "focus": "Decision logic, risk evaluation, outcome tracking.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "Decision logic, risk evaluation, outcome tracking.",
      "angle": [
        "Think probabilistically.",
        "Weigh tradeoffs carefully.",
        "Design for accountability."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  },
  {
    "id": "applied-ai-analyst",
    "category": "analysis",
    "title": "Applied AI Analyst",
    "oneLiner": "Hands-on analysis of AI use cases.",
    "tags": [
      "Use-cases",
      "Validation",
      "Review",
      "Insights",
      "Practical"
    ],
    "focus": "Use-case evaluation, performance review, insight generation.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "Use-case evaluation, performance review, insight generation.",
      "angle": [
        "Practical and grounded.",
        "Test ideas quickly.",
        "Focus on what works."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  },
  {
    "id": "applied-ai-engineer-pf",
    "category": "weird",
    "title": "Applied AI Engineer (Product-Facing)",
    "oneLiner": "Bridges product and engineering for AI features.",
    "tags": [
      "Boundary",
      "Intent",
      "Validation",
      "Collaboration",
      "Execution"
    ],
    "focus": "Translate product intent, support implementation, validate outcomes.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "Translate product intent, support implementation, validate outcomes.",
      "angle": [
        "Live at the boundary.",
        "Reduce miscommunication.",
        "Protect product intent."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  },
  {
    "id": "ai-systems-engineer-pf",
    "category": "weird",
    "title": "AI Systems Engineer (Product-Facing)",
    "oneLiner": "Own system behavior from a product lens.",
    "tags": [
      "System-first",
      "Reliability",
      "Behavior",
      "Alignment",
      "Downstream"
    ],
    "focus": "System design input, reliability feedback, cross-team alignment.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "System design input, reliability feedback, cross-team alignment.",
      "angle": [
        "System-first thinking.",
        "Prevent downstream issues.",
        "Focus on behavior, not code."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  },
  {
    "id": "ai-enablement-lead",
    "category": "weird",
    "title": "AI Enablement Lead",
    "oneLiner": "Drives internal AI adoption.",
    "tags": [
      "Training",
      "Best Practices",
      "Change Mgmt",
      "Enablement",
      "Usability"
    ],
    "focus": "Training/guidance, best practices, change management.",
    "lensDefault": "pm",
    "lensSnapshots": {
      "pm": {
        "label": "PM lens",
        "badge": "OUTCOMES",
        "preview": "I turn ambiguity into <b>shippable behavior</b> with constraints and recovery."
      },
      "eval": {
        "label": "Eval lens",
        "badge": "QUALITY",
        "preview": "I define <b>good</b> with rubrics + tests, then stop regressions."
      },
      "ops": {
        "label": "Ops lens",
        "badge": "STABILITY",
        "preview": "I operationalize change control so behavior stays <b>predictable</b>."
      }
    },
    "lenses": {
      "pm": {
        "summary": "Outcome framing + behavior contracts: what the system will do, won\u2019t do, and how it recovers.",
        "bullets": [
          "Define success criteria + constraints.",
          "Prioritize recovery paths over perfect answers.",
          "Translate ambiguity into buildable contracts."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "eval": {
        "summary": "Rubrics + adversarial tests + regressions: catch drift and \u2018polite nonsense\u2019 early.",
        "bullets": [
          "Write evaluation criteria teams can apply consistently.",
          "Design adversarial + realistic test sets.",
          "Run release-to-release diffs to prevent regressions."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      },
      "ops": {
        "summary": "Versioning + monitoring + rollout discipline: ship quickly without roulette.",
        "bullets": [
          "Version prompts/config and track change impact.",
          "Monitor high-signal failure patterns.",
          "Define rollback triggers and escalation paths."
        ],
        "proofStack": {
          "receipts": [
            {
              "label": "Coverage Compass",
              "note": "decision UX",
              "href": "#"
            },
            {
              "label": "UBR",
              "note": "routing + ops",
              "href": "#"
            },
            {
              "label": "Agents",
              "note": "automation dashboard",
              "href": "#"
            }
          ],
          "caseNotes": [
            "Problem: ambiguous requirements + AI uncertainty can produce inconsistent behavior.",
            "Constraint: ship fast without breaking trust or creating silent regressions.",
            "Decision: define behavior contracts, evaluate with rubrics, and operationalize change control.",
            "Result: predictable UX + safer iteration velocity."
          ],
          "signals": [
            "Defines constraints + recovery states (not just happy path).",
            "Uses diff-first reviews and regression checks to prevent drift.",
            "Optimizes for adoption: human control where it matters."
          ]
        }
      }
    },
    "briefing": {
      "summary": "Training/guidance, best practices, change management.",
      "angle": [
        "Strong translator/teacher.",
        "Lower adoption friction.",
        "Make AI usable, not scary."
      ],
      "week": {
        "w1": [
          "Clarify success criteria + top failure modes.",
          "Map workflows + integration seams.",
          "Draft behavior contracts + recovery states."
        ],
        "w4": [
          "Ship first evaluation gate (rubric + targeted suite).",
          "Add versioning + diffs for high-risk changes.",
          "Implement top recovery patterns (clarify + fallback)."
        ],
        "w12": [
          "Scale eval/ops coverage to live usage patterns.",
          "Add drift/incident cadence and reduce top harms.",
          "Standardize patterns and documentation across teams."
        ]
      },
      "fails": [
        "Silent regressions.",
        "Overfitting to demos.",
        "Users trapped without recovery paths.",
        "Ambiguous ownership across teams."
      ],
      "partners": [
        "Product",
        "Engineering",
        "Design / UX",
        "Data / Analytics",
        "Support / Ops",
        "Legal / Policy (when needed)"
      ],
      "artifacts": [
        "Behavior spec (states + recovery)",
        "Evaluation rubric + test set",
        "Release notes + change impact",
        "Incident taxonomy + playbooks"
      ]
    }
  }
];
const state = { cat:"all", q:"", compact:false, autoScore:true, scoreboardLens:"pm" };
    const $ = (s)=>document.querySelector(s);
    const el = (tag, props={})=>Object.assign(document.createElement(tag), props);

    function escapeHtml(str){
      return (str ?? "")
        .replaceAll("&","&amp;")
        .replaceAll("<","&lt;")
        .replaceAll(">","&gt;")
        .replaceAll('"',"&quot;")
        .replaceAll("'","&#039;");
    }

    function highlight(text, q){
      const query = q.trim();
      if(!query) return escapeHtml(text);
      const safe = escapeHtml(text);
      const parts = query.split(/\s+/).filter(w=>w.length>=2).slice(0,6);
      if(parts.length===0) return safe;
      const rx = new RegExp("(" + parts.map(p=>p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "ig");
      return safe.replace(rx, "<mark class='hl'>$1</mark>");
    }

    function matches(role){
      const q = state.q.trim().toLowerCase();
      if(state.cat!=="all" && role.category!==state.cat) return false;
      if(!q) return true;

      const lensText = Object.values(role.lenses)
        .map(l => [l.summary, ...(l.bullets||[]), ...(l.proofStack?.caseNotes||[]), ...(l.proofStack?.signals||[])].join(" "))
        .join(" ");

      const hay = [
        role.title, role.oneLiner, role.focus,
        (role.tags||[]).join(" "),
        lensText,
        role.briefing?.summary || "",
        (role.briefing?.fails||[]).join(" "),
        (role.briefing?.artifacts||[]).join(" ")
      ].join(" ").toLowerCase();

      return hay.includes(q);
    }

    function groupByCategory(list){
      const map = new Map();
      for(const c of CATS) map.set(c.id, []);
      for(const r of list) map.get(r.category).push(r);
      return map;
    }

    const SCORE_PRESETS = {
      pm: { pill:"LENS: PM", delivery:72, rigor:58, trust:62,
        notes:{ delivery:"Outcome + constraints + recovery contracts that ship cleanly.",
               rigor:"Enough rigor to prevent drift without freezing velocity.",
               trust:"Predictability and clear user promise (reduce surprise)."},
        emph:"delivery"
      }
    };

    function setScoreboard(lens){
      const p = SCORE_PRESETS[lens] || SCORE_PRESETS.pm;
      $("#scorePill").textContent = p.pill;
      $("#fDelivery").style.width = p.delivery + "%";
      $("#fRigor").style.width = p.rigor + "%";
      $("#fTrust").style.width = p.trust + "%";
      $("#nDelivery").textContent = p.notes.delivery;
      $("#nRigor").textContent = p.notes.rigor;
      $("#nTrust").textContent = p.notes.trust;
      $("#bDelivery").classList.toggle("emph", p.emph==="delivery");
      $("#bRigor").classList.toggle("emph", p.emph==="rigor");
      $("#bTrust").classList.toggle("emph", p.emph==="trust");
    }

    const mask = $("#mask");
    $("#close").onclick = closeDrawer;
    mask.addEventListener("click",(e)=>{ if(e.target===mask) closeDrawer(); });

    function openDrawer(role, activeLens){
      $("#dTitle").textContent = role.title;
      $("#dSub").textContent = role.oneLiner;
      $("#dSummary").textContent = role.briefing?.summary || role.focus || "";

      const angle = $("#dAngle"); angle.innerHTML="";
      (role.briefing?.angle || []).forEach(x => angle.appendChild(el("li",{ textContent:x })));

      const t = $("#dTimeline"); t.innerHTML="";
      const wk = role.briefing?.week || { w1:[], w4:[], w12:[] };
      const mk = (label, items)=>{
        const card = el("div",{ className:"tCard" });
        card.appendChild(el("b",{ textContent:label }));
        const ul = el("ul",{});
        (items||[]).forEach(x=>ul.appendChild(el("li",{ textContent:x })));
        card.appendChild(ul);
        return card;
      };
      t.appendChild(mk("Week 1", wk.w1));
      t.appendChild(mk("Week 4", wk.w4));
      t.appendChild(mk("Week 12", wk.w12));

      const fails = $("#dFails"); fails.innerHTML="";
      (role.briefing?.fails || []).forEach(x => fails.appendChild(el("li",{ textContent:x })));

      const partners = $("#dPartners"); partners.innerHTML="";
      (role.briefing?.partners || []).forEach(x => partners.appendChild(el("li",{ textContent:x })));

      const arts = $("#dArtifacts"); arts.innerHTML="";
      (role.briefing?.artifacts || []).forEach(x => arts.appendChild(el("li",{ textContent:x })));

      const lensKey = activeLens || role.lensDefault || "pm";
      const lens = role.lenses[lensKey] || role.lenses[role.lensDefault] || Object.values(role.lenses)[0];
      const ps = lens?.proofStack;

      $("#dProofIntro").textContent = `Active lens: ${lensKey.toUpperCase()} · ${lens?.summary || "Proof stack"}`;

      const links = $("#dProofLinks"); links.innerHTML="";
      (ps?.receipts || []).forEach(p=>{
        const a = el("a",{ className:"proofLink", href:p.href || "#" });
        a.innerHTML = `${escapeHtml(p.label)} <span>${escapeHtml(p.note || "")}</span>`;
        a.onclick = (e)=>{ e.stopPropagation(); };
        links.appendChild(a);
      });

      const sig = $("#dProofSignals"); sig.innerHTML="";
      (ps?.signals || []).forEach(x=> sig.appendChild(el("li",{ textContent:x })));

      mask.classList.add("show");
      document.body.style.overflow="hidden";

      const nb = $("#noteBox");
      if(!nb.value.trim()) nb.value = "";
$("#btnCopy").onclick = copyNote;
    }

    function closeDrawer(){ mask.classList.remove("show"); document.body.style.overflow=""; }

    function renderRoleCard(role){
      const card = el("div",{ className:"roleCard" });
      card.addEventListener("mousemove",(e)=>{
        const r = card.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 100;
        const y = ((e.clientY - r.top) / r.height) * 100;
        card.style.setProperty("--mx", x + "%");
        card.style.setProperty("--my", y + "%");
      });

      const top = el("div",{ className:"roleTop" });
      const info = el("div",{});
      const h = el("h3",{ className:"roleName" }); h.innerHTML = highlight(role.title, state.q); info.appendChild(h);
      const d = el("p",{ className:"roleDesc" }); d.innerHTML = highlight(role.oneLiner, state.q); info.appendChild(d);

      const tags = el("div",{ className:"tags" });
      (role.tags||[]).slice(0,6).forEach((t,i)=>{
        const span = el("span",{ className:"tag "+(i===0?"lime":i===1?"pink":"" ) });
        span.innerHTML = highlight(t, state.q);
        tags.appendChild(span);
      });
      info.appendChild(tags);
      top.appendChild(info);

      const mini = el("div",{ className:"miniHint" });
      mini.innerHTML = `Click for briefing →<br><span style="font-family:var(--mono); font-size:11px;">lens + proofs + plan</span>`;
      top.appendChild(mini);

      top.onclick = ()=>openDrawer(role, role.lensDefault || "pm");
      card.appendChild(top);

      const wrap = el("div",{ className:"lensWrap" });
      const lensGrid = el("div",{ className:"lensGrid" });
      const lensSummary = el("div",{ className:"lensSummary" });
      const lensBullets = el("ul",{ className:"lensBullets" });
      const proof = el("div",{ className:"proofStack" });
      const tabs = el("div",{ className:"proofTabs" });
      const body = el("div",{ className:"proofBody" });

      const tReceipts = el("div",{ className:"tab active", textContent:"Receipts" });
      tabs.appendChild(tReceipts);
      proof.appendChild(tabs);
      proof.appendChild(body);

      function renderLens(){
        const L = role.lenses[role.lensDefault] || Object.values(role.lenses)[0];
        lensSummary.innerHTML = highlight(L.summary, state.q);
        lensBullets.innerHTML="";
        (L.bullets||[]).forEach(x=>{
          const li = el("li",{}); li.innerHTML = highlight(x, state.q); lensBullets.appendChild(li);
        });

        body.innerHTML="";
        const links = el("div",{ className:"proofLinks" });
        (L.proofStack?.receipts||[]).forEach(p=>{
          const a = el("a",{ className:"proofLink", href:p.href||"#" });
          a.innerHTML = `${highlight(p.label, state.q)} <span>${highlight(p.note||"", state.q)}</span>`;
          a.onclick=(e)=>{ e.stopPropagation(); };
          links.appendChild(a);
        });
        body.appendChild(links);
      }

      wrap.appendChild(lensGrid);
      wrap.appendChild(lensSummary);
      wrap.appendChild(lensBullets);
      wrap.appendChild(proof);
      card.appendChild(wrap);

      renderLens();
      return card;
    }

    function render(){
      document.body.classList.toggle("compact", state.compact);
      $("#score").style.display = state.autoScore ? "" : "none";
      const filtered = ROLES.filter(matches);
      const grouped = groupByCategory(filtered);
      const root = $("#sections"); root.innerHTML="";
      for(const c of CATS){
        const roles = grouped.get(c.id);
        if(!roles || roles.length===0) continue;

        const section = el("div",{ className:"section open" });
        const head = el("div",{ className:"secHead" });
        head.onclick=()=>section.classList.toggle("open");
        const left = el("div",{}); left.appendChild(el("h2",{ className:"secTitle", textContent:c.name }));
        const meta = el("div",{ className:"secMeta" }); meta.appendChild(el("div",{ className:"pill", textContent:`${roles.length} role${roles.length>1?"s":""}` }));
        const chev = el("div",{ className:"chev", innerHTML:"▾" });
        head.appendChild(left); head.appendChild(meta); head.appendChild(chev);

        const body = el("div",{ className:"roles" });
        roles.forEach(r=> body.appendChild(renderRoleCard(r)));

        section.appendChild(head);
        section.appendChild(body);
        root.appendChild(section);
      }
    }

    document.addEventListener("keydown",(e)=>{
      if(e.key==="/"){ e.preventDefault(); $("#q").focus(); }
      if(e.key==="Escape"){ closeDrawer(); }
    });

    $("#q").addEventListener("input",(e)=>{ state.q=e.target.value; render(); });

    function toggleEl(elm, on){ elm.classList.toggle("on", !!on); }
    function wireToggle(id, getter, setter){
      const t = $(id);
      const click = ()=>{
        const next = !getter();
        setter(next);
        toggleEl(t, next);
        render();
      };
      t.addEventListener("click", click);
      t.addEventListener("keydown",(e)=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); click(); }});
      toggleEl(t, getter());
    }
    wireToggle("#tRecruiter", ()=>state.compact, (v)=>state.compact=v);
    wireToggle("#tAutoScore", ()=>state.autoScore, (v)=>state.autoScore=v);

    setScoreboard(state.scoreboardLens);
    render();
  