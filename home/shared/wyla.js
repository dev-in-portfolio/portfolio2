/* shared/wyla.js
   Populates and controls the "What you're looking at" strip.
   - Non-blocking (inline, not modal)
   - Dismissible with localStorage
   - Optional details toggle where confusion is likely
*/
(function(){
  const el = document.querySelector('[data-wyla]');
  if(!el) return;

  const app = (document.body && document.body.getAttribute('data-app')) ? document.body.getAttribute('data-app') : 'nexus';

  const LS_HIDE_KEY = `wyla_hide_${app}_v1`;

  const copy = {
    aeon: {
      title: 'What you’re looking at',
      body: 'AEON is a planet-flight and warp-transition WebGL lab. Use the controls to select a target body and adjust lighting/quality.',
      tryFirst: 'Try first: pick a target body, then change Sun Angle for the biggest cinematic difference.',
      details: null
    },

    event: {
      title: 'What you’re looking at',      tryFirst: 'Try first: start in SIM, pick a preset, then adjust parameters gradually.',
      details: [
        'If the scene gets unstable, return to a preset and reapply changes more slowly. Big jumps can look “broken” even when it’s functioning.',
        'LIVE availability can vary by network/browser conditions — SIM is the baseline experience.'
      ]
    },
    helios: {
      title: 'What you’re looking at',
      body: 'HELIOS pairs a solar-flare visual with a telemetry cockpit and API status. The UI stays readable even if feeds fail.',
      tryFirst: 'Try first: set Intensity + Zoom, press Erupt, then Boost once you’ve seen the baseline.',
      details: null
    },
    helix: {
      title: 'What you’re looking at',
      body: 'HELIX is a strand-based visual system with deliberate initialization and mode switching. The helix visual appears after you initialize the strand.',
      tryFirst: 'Try first: click Load Strand, then change Mode and toggle layers one at a time.',
      details: [
        'Start here: Click “Load Strand” to initialize the helix visual.',
        'If you don’t see the helix yet, nothing’s broken — it appears after Load Strand.'
      ]
    },
    magma: {
      title: 'What you’re looking at',
      body: 'MAGMA is a 3D chamber environment built for stability and readable control flow. The viewport is the chamber; the sidebar is the control surface.',
      tryFirst: 'Try first: get your camera comfortable, then adjust one control at a time.',
      details: null
    },
    string: {
      title: 'What you’re looking at',
      body: 'STRING is a 4D morph/projection lab. Mode + Family define the form; Density and 4D Mix shape it; motion layers come last.',
      tryFirst: 'Try first: pick Mode + Family, then adjust 4D Mix one axis at a time.',
      details: null
    },
    tectonic: {
      title: 'What you’re looking at',
      body: 'TECTONIC is a seismic activity visualizer with a live USGS quake feed and a controllable sim layer.',
      tryFirst: 'Try first: adjust Activity and Magnitude, then watch the feed populate.',
      details: [
        'If the feed shows “Loading…” that’s normal — keep using the controls while it resolves.',
        'If live data is unavailable due to network/CORS conditions, the app remains usable with its sim controls.'
      ]
    },
    transit: {
      title: 'What you’re looking at',
      body: 'TRANSIT is a 3D navigation-style cockpit with SIM/LIVE modes. It’s designed to stay stable under motion.',
      tryFirst: 'Try first: start in SIM to learn behavior, then switch to LIVE only if you want external input.',
      details: [
        'SIM is the reference experience; LIVE validates real input conditions.',
        'If LIVE data is delayed or unavailable, that’s expected in browser environments — SIM is still the intended demo path.'
      ]
    },
    vortex: {
      title: 'What you’re looking at',
      body: 'VORTEX visualizes volatility using charts + a motion field, with SIM/LIVE data modes and asset switching.',
      tryFirst: 'Try first: start in SIM, switch assets (BTC/ETH/SOL), then enable LIVE after you understand scaling.',
      details: [
        'If LIVE isn’t available due to network/CORS conditions, SIM remains the baseline experience.',
        'Small parameter changes are best — big jumps can obscure what actually changed.'
      ]
    }
  };

  const c = copy[app] || {
    title: 'What you’re looking at',
    body: 'This is a Nexus module. Use Help/README for controls and assumptions.',
    tryFirst: null,
    details: null
  };

  // Respect hide state
  try{
    if(localStorage.getItem(LS_HIDE_KEY) === '1'){
      el.classList.add('is-hidden');
      return;
    }
  } catch {}

  const detailsEnabled = Array.isArray(c.details) && c.details.length > 0;

  const html = `
    <div class="wyla-wrap" id="wylaWrap">
      <div class="wyla-card" id="wylaCard">
        <div class="wyla-row">
          <div class="wyla-left">
            <div class="wyla-badge" aria-hidden="true"></div>
            <div class="wyla-text">
              <div class="wyla-title">
                ${escapeHtml(c.title)}
                <span class="wyla-mini">${escapeHtml(app.toUpperCase())}</span>
              </div>
              <div class="wyla-body">
                ${escapeHtml(c.body)}
                ${c.tryFirst ? `<br><strong>${escapeHtml(c.tryFirst)}</strong>` : ``}
              </div>
            </div>
          </div>
          <div class="wyla-actions">
            ${detailsEnabled ? `<button class="wyla-btn link" id="wylaMore" type="button">Details</button>` : ``}
            <button class="wyla-btn secondary" id="wylaDismiss" type="button" title="Dismiss">Dismiss</button>
          </div>
        </div>
        ${detailsEnabled ? `
          <div class="wyla-details" id="wylaDetails">
            <p class="h">Details</p>
            ${c.details.map(t => `<p>${escapeHtml(t)}</p>`).join('')}
            <p><span class="h">Learn more:</span> Use Help/README for controls and assumptions. Use Ask Althea for “what does this do?” questions.</p>
          </div>
        ` : ``}
      </div>
    </div>
  `;

  el.innerHTML = html;

  const wrap = document.getElementById('wylaWrap');
  const card = document.getElementById('wylaCard');
  const more = document.getElementById('wylaMore');
  const dismiss = document.getElementById('wylaDismiss');

  if(more){
    more.addEventListener('click', () => {
      card.classList.toggle('is-open');
      more.textContent = card.classList.contains('is-open') ? 'Close' : 'Details';
    });
  }
  if(dismiss){
    dismiss.addEventListener('click', () => {
      wrap.classList.add('is-hidden');
      try{ localStorage.setItem(LS_HIDE_KEY, '1'); } catch {}
    });
  }

  function escapeHtml(s){
    return String(s)
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'","&#039;");
  }
})();
