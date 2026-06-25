import type { AEONState } from '../boot';

export type StateUpdater = (partial: Partial<AEONState>) => void;

export function wireControls(
  state: AEONState,
  update: StateUpdater,
  callbacks: {
    onWarp: (body: string) => void;
    onScan: () => void;
    onHeroCam: () => void;
    onQualityToggle: () => void;
    onInsaneToggle: () => void;
  }
): () => void {
  const cleaners: (() => void)[] = [];

  const bodies = ['saturn', 'pluto', 'mars', 'ceres', 'europa'];

  bodies.forEach((id) => {
    const btn = document.getElementById(`btn-${id}`);
    if (btn) {
      const handler = () => { callbacks.onWarp(id); };
      btn.addEventListener('click', handler);
      cleaners.push(() => btn.removeEventListener('click', handler));
    }
  });

  const sunSlider = document.getElementById('sunSlider') as HTMLInputElement;
  if (sunSlider) {
    const handler = (e: Event) => {
      update({ sunAngle: Number((e.target as HTMLInputElement).value) });
    };
    sunSlider.addEventListener('input', handler);
    cleaners.push(() => sunSlider.removeEventListener('input', handler));
  }

  const btnEclipse = document.getElementById('btnEclipse');
  if (btnEclipse) {
    const handler = () => {
      const newVal = !state.eclipse;
      update({ eclipse: newVal });
      btnEclipse.classList.toggle('active', newVal);
    };
    btnEclipse.addEventListener('click', handler);
    cleaners.push(() => btnEclipse.removeEventListener('click', handler));
  }

  const btnBinary = document.getElementById('btnBinary');
  if (btnBinary) {
    const handler = () => {
      const newVal = !state.binary;
      update({ binary: newVal });
      btnBinary.classList.toggle('active', newVal);
    };
    btnBinary.addEventListener('click', handler);
    cleaners.push(() => btnBinary.removeEventListener('click', handler));
  }

  const btnScan = document.getElementById('btnScan');
  if (btnScan) {
    const handler = () => callbacks.onScan();
    btnScan.addEventListener('click', handler);
    cleaners.push(() => btnScan.removeEventListener('click', handler));
  }

  const btnHero = document.getElementById('heroCamBtn');
  if (btnHero) {
    const handler = () => callbacks.onHeroCam();
    btnHero.addEventListener('click', handler);
    cleaners.push(() => btnHero.removeEventListener('click', handler));
  }

  ['cinematic', 'deep', 'analog'].forEach((g) => {
    const btn = document.getElementById(`grade-${g}`);
    if (btn) {
      const handler = () => {
        document.querySelectorAll('.visuals-grid .btn-toggle').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        update({ grade: g as AEONState['grade'] });
        document.body.classList.remove('grade-cinematic', 'grade-deep', 'grade-analog');
        document.body.classList.add(`grade-${g}`);
      };
      btn.addEventListener('click', handler);
      cleaners.push(() => btn.removeEventListener('click', handler));
    }
  });

  const qualityBtn = document.getElementById('quality-pill');
  if (qualityBtn) {
    const handler = () => callbacks.onQualityToggle();
    qualityBtn.addEventListener('click', handler);
    cleaners.push(() => qualityBtn.removeEventListener('click', handler));
  }

  const insaneBtn = document.getElementById('insaneBtn');
  if (insaneBtn) {
    const handler = () => callbacks.onInsaneToggle();
    insaneBtn.addEventListener('click', handler);
    cleaners.push(() => insaneBtn.removeEventListener('click', handler));
  }

  const keyHandler = (e: KeyboardEvent) => {
    if (e.key === 'p' || e.key === 'P') {
      update({ presentation: !state.presentation });
      document.body.classList.toggle('presentation-mode');
    }
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-shell.visible').forEach((m) => m.classList.remove('visible'));
    }
  };
  document.addEventListener('keydown', keyHandler);
  cleaners.push(() => document.removeEventListener('keydown', keyHandler));

  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    const handler = () => {
      const id = (btn as HTMLElement).getAttribute('data-close-modal');
      if (id) {
        const shell = document.getElementById(id);
        if (shell) shell.classList.remove('visible');
      }
    };
    btn.addEventListener('click', handler);
    cleaners.push(() => btn.removeEventListener('click', handler));
  });

  document.querySelectorAll('.modal-shell').forEach((shell) => {
    const handler = (e: Event) => {
      if (e.target === shell) shell.classList.remove('visible');
    };
    shell.addEventListener('click', handler);
    cleaners.push(() => shell.removeEventListener('click', handler));
  });

  return () => { for (const fn of cleaners) fn(); };
}

export function updateBodyUI(body: string) {
  document.querySelectorAll('.body-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.id === `btn-${body}`);
  });
}
