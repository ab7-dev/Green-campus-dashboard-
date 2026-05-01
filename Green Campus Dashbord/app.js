    // ============================================================
    //  GLOBAL STATE — IoT Simulation (unchanged)
    // ============================================================
    var BLID = ['A', 'B', 'C', 'D'];
    var BLNM = ['Engineering', 'Science', 'Admin', 'Hostel'];
    var WCAP = [15000, 10000, 8000, 20000];
    var WTCAP = [8000, 6000, 5000, 12000];
    var DRAIN_RATE = [0.12, 0.08, 0.06, 0.18];
    var REFILL_RATE = 0.05;
    var PURB = [98.5, 97.2, 99.1, 96.4];
    var EBASE = [
      { ht: 11.0, lt: 415, amp: 48, pf: 0.91 },
      { ht: 11.0, lt: 415, amp: 34, pf: 0.88 },
      { ht: 11.0, lt: 415, amp: 26, pf: 0.90 },
      { ht: 11.0, lt: 415, amp: 62, pf: 0.84 }
    ];
    var bWater = [78, 62, 85, 45];
    var bWaste = [35, 28, 52, 65];
    var bRefill = [false, false, false, false];
    var elec = EBASE.map(function (b) { return { ht: b.ht, lt: b.lt, amp: b.amp, pf: b.pf, freq: 50.0, fluct: 2.0 }; });
    var active = 0;
    var isDark = false;   // start in light (architectural) mode
    var waveH = [];
 
    function pbar(wl) { return (wl / 100 * 3.2 + 0.4).toFixed(2); }
    function getPur(i) { return Math.min(100, Math.max(85, PURB[i] + Math.sin(Date.now() / 55000 + i * 1.8) * 0.28)).toFixed(1); }
    function getKW(i) { var e = elec[i]; return (e.lt * e.amp * 1.732 * e.pf / 1000).toFixed(1); }
    function ge(id) { return document.getElementById(id); }
    function si(id, h) { var el = ge(id); if (el) el.innerHTML = h; }
 

 
    // ============================================================
    //  UPDATE 3D MESHES (unchanged logic)
    // ============================================================
    function upd3DWater(i, pct) {
      var wm = wMeshes[i]; if (!wm) return;
      var sl = Math.max(0.001, pct / 100);
      wm.mesh.scale.y = sl; wm.mesh.position.y = wm.baseY + (wm.tH * sl) / 2;
      wm.mat.color.setHex(pct > 60 ? 0x1a99ff : pct > 30 ? 0x0d77e8 : 0x0a5bc4);
      wm.mat.emissive.setHex(pct > 60 ? 0x003daa : pct > 30 ? 0x002d88 : 0x001e66);
    }
    function upd3DWaste(i) {
      var wf = wFMeshes[i], mat = wFMats[i], wl = wFLights[i];
      if (!wf || !mat) return;
      var sl = Math.max(0.001, bWaste[i] / 100);
      wf.mesh.scale.y = sl; wf.mesh.position.y = wf.baseY + (wf.fH * sl) / 2;
      var c = bWaste[i] > 80 ? 0xdd1111 : bWaste[i] > 60 ? 0xffaa00 : 0x22cc44;
      mat.color.setHex(c);
      mat.emissive.setHex(bWaste[i] > 80 ? 0x1a0000 : bWaste[i] > 60 ? 0x1a0e00 : 0x0a2210);
      if (wl) { wl.color.setHex(c); wl.intensity = 0.3 + (bWaste[i] / 100) * 0.9; }
    }
 
    // ============================================================
    //  AUTO DRAIN / FILL SIMULATION (unchanged)
    // ============================================================
    var TICK_S = 0.5;
    function simTick() {
      var hr = new Date().getHours();
      var lf = (hr >= 9 && hr <= 18) ? 1.0 : (hr >= 7 && hr <= 21) ? 0.7 : 0.3;
      var refillHour = (hr >= 2 && hr <= 5);
      for (var i = 0; i < 4; i++) {
        if (refillHour && !bRefill[i]) bRefill[i] = true;
        if (!refillHour && bWater[i] >= 98) bRefill[i] = false;
        if (bRefill[i]) {
          bWater[i] = Math.min(100, bWater[i] + REFILL_RATE * TICK_S);
          if (bWater[i] >= 98) bRefill[i] = false;
        } else {
          // Realistic: base drain + random burst events + occasional flush spikes
          var burstChance = Math.random();
          var burst = (burstChance > 0.92) ? DRAIN_RATE[i] * 2.2 :   // 8% chance: heavy usage burst
            (burstChance > 0.78) ? DRAIN_RATE[i] * 1.4 :   // 14% chance: moderate spike
              (burstChance < 0.08) ? -DRAIN_RATE[i] * 0.5 :  // 8% chance: brief low usage
                0;
          var noise = (Math.random() - 0.5) * DRAIN_RATE[i] * 0.6;  // ±30% random noise
          var dr = (DRAIN_RATE[i] * lf + burst) * TICK_S + noise * TICK_S;
          bWater[i] = Math.max(0, bWater[i] - Math.max(0, dr));
          if (bWater[i] <= 10) bRefill[i] = true;
        }
        // Waste fills continuously (wastewater generated whenever water is used)
        var burstW = Math.random();
        var burstWaste = (burstW > 0.90) ? DRAIN_RATE[i] * 1.8 : (burstW < 0.10) ? 0 : 1.0;
        var noiseW = (Math.random() - 0.5) * DRAIN_RATE[i] * 0.5;
        var wr = (DRAIN_RATE[i] * lf * 0.65 * burstWaste) * TICK_S + noiseW * TICK_S;
        bWaste[i] = Math.min(100, bWaste[i] + Math.max(0, wr));
        // Simulate collection: when tank hits critical (>=90%) pump it out
        if (bWaste[i] >= 90) {
          bWaste[i] = Math.max(0, bWaste[i] - 3.5 * TICK_S);
        }
        upd3DWater(i, bWater[i]); upd3DWaste(i);
      }
      // Write live data to localStorage for dashboard
      try {
        localStorage.setItem('iot_live', JSON.stringify({
          ts: Date.now(),
          blocks: BLID.map(function (id, i) {
            return {
              id: id, label: BLNM[i],
              w: { pct: parseFloat(bWater[i].toFixed(2)), cap: WCAP[i], vol: Math.round(WCAP[i] * bWater[i] / 100), pres: parseFloat(pbar(bWater[i])), pur: parseFloat(getPur(i)) },
              wt: { pct: parseFloat(bWaste[i].toFixed(2)), cap: WTCAP[i], vol: Math.round(WTCAP[i] * bWaste[i] / 100) },
              e: { ht: parseFloat(elec[i].ht.toFixed(3)), lt: elec[i].lt, amp: parseFloat(elec[i].amp.toFixed(1)), kw: parseFloat(getKW(i)), freq: parseFloat(elec[i].freq.toFixed(2)), pf: parseFloat(elec[i].pf.toFixed(3)), fluct: parseFloat(elec[i].fluct.toFixed(1)) }
            };
          }),
          drain: DRAIN_RATE, refill: bRefill
        }));
      } catch (ex) { }
      ge('slw').value = Math.round(bWater[active]);
      ge('slwt').value = Math.round(bWaste[active]);
      ge('svw').textContent = Math.round(bWater[active]) + '%';
      ge('svwt').textContent = Math.round(bWaste[active]) + '%';
      ge('svwt').style.color = bWaste[active] > 80 ? 'var(--rd)' : bWaste[active] > 60 ? 'var(--ye)' : 'var(--gn)';
      renderDash();
      bdPushHistory();
    }
 
    // ============================================================
    //  ELECTRICITY SIMULATION (unchanged)
    // ============================================================
    function simElec() {
      var hr = new Date().getHours();
      var lf = (hr >= 9 && hr <= 18) ? 1.0 : (hr >= 7 && hr <= 21) ? 0.8 : 0.5;
      for (var i = 0; i < 4; i++) {
        var b = EBASE[i], e = elec[i];
        e.ht = parseFloat((b.ht + (Math.random() - 0.5) * 0.38 + (Math.random() > 0.95 ? -(Math.random() * 0.35) : 0)).toFixed(3));
        e.lt = b.lt + Math.round((Math.random() - 0.5) * 16);
        e.amp = parseFloat(Math.max(4, (b.amp * lf + (Math.random() - 0.5) * 9)).toFixed(1));
        e.freq = parseFloat((50 + (Math.random() - 0.5) * 0.28).toFixed(2));
        e.pf = parseFloat(Math.min(0.99, Math.max(0.72, b.pf + (Math.random() - 0.5) * 0.05)).toFixed(3));
        e.fluct = parseFloat((Math.abs((Math.random() - 0.5) * 22)).toFixed(1));
        PURB[i] = Math.min(100, Math.max(85, PURB[i] + (Math.random() - 0.5) * 0.04));
      }
      waveH.push(elec[active].lt);
      if (waveH.length > 44) waveH.shift();
    }
 
    // ============================================================
    //  WAVE CHART (unchanged)
    // ============================================================
    function drawWave() {
      var cvs = ge('wvc'); if (!cvs) return;
      cvs.width = cvs.offsetWidth || 110; cvs.height = 26;
      var ctx = cvs.getContext('2d'), W = cvs.width;
      ctx.clearRect(0, 0, W, 26);
      if (waveH.length < 2) return;
      var mn = 390, mx = 440;
      ctx.beginPath();
      ctx.strokeStyle = isDark ? 'rgba(255,214,0,.78)' : 'rgba(150,100,0,.8)';
      ctx.lineWidth = 1.2;
      for (var n = 0; n < waveH.length; n++) {
        var x = (n / (waveH.length - 1)) * W, y = 26 - (waveH[n] - mn) / (mx - mn) * 26;
        if (n === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.beginPath(); ctx.strokeStyle = 'rgba(0,0,0,.08)'; ctx.lineWidth = 0.8; ctx.setLineDash([2, 3]);
      var ny = 26 - (415 - mn) / (mx - mn) * 26;
      ctx.moveTo(0, ny); ctx.lineTo(W, ny); ctx.stroke(); ctx.setLineDash([]);
    }
 
    // ============================================================
    //  DASHBOARD RENDER (unchanged)
    // ============================================================
    function renderDash() {
      var i = active, wl = bWater[i], cap = WCAP[i];
      var vol = Math.round(cap * wl / 100), pr = pbar(wl), pu = getPur(i);
      var e = elec[i], kw = getKW(i);
      ge('wdtag').textContent = bRefill[i] ? 'REFILLING' : 'DRAIN';
      ge('wdtag').style.color = bRefill[i] ? 'var(--gn)' : 'var(--ye)';
      var wfTagTxt = bWaste[i] >= 90 ? 'COLLECTING' : bWaste[i] > 60 ? 'HIGH' : 'FILLING';
      var wfTagClr = bWaste[i] >= 90 ? 'var(--rd)' : bWaste[i] > 60 ? 'var(--ye)' : 'var(--gn)';
      ge('wftag').textContent = wfTagTxt; ge('wftag').style.color = wfTagClr;
      var wc = wl > 60 ? 'var(--cy)' : wl > 30 ? 'var(--ye)' : 'var(--rd)';
      si('mwl', wl.toFixed(1) + '<span class="mu">%</span>'); ge('mwl').style.color = wc;
      ge('bwl').style.width = wl + '%'; ge('bwl').style.background = wl > 60 ? '#00e5ff' : wl > 30 ? '#ffd600' : '#ff1744';
      si('mcap', cap.toLocaleString() + '<span class="mu">L</span>');
      si('mvol', vol.toLocaleString() + '<span class="mu">L</span>');
      si('mprs', pr + '<span class="mu">bar</span>');
      ge('mprs').style.color = pr > 3 ? '#80d8ff' : pr > 1.5 ? '#40c8f0' : 'var(--ye)';
      var pc = pu > 97 ? 'var(--gn)' : pu > 92 ? 'var(--ye)' : 'var(--rd)';
      si('mpur', pu + '<span class="mu">%</span>'); ge('mpur').style.color = pc;
      ge('bpur').style.width = pu + '%'; ge('bpur').style.background = pu > 97 ? '#00e676' : pu > 92 ? '#ffd600' : '#ff1744';
      var hc = (e.ht > 10.7 && e.ht < 11.3) ? 'var(--ye)' : 'var(--rd)';
      si('mht', e.ht.toFixed(3) + '<span class="mu">kV</span>'); ge('mht').style.color = hc;
      var lc2 = (e.lt > 400 && e.lt < 430) ? '#ffa726' : 'var(--rd)';
      si('mlt', e.lt + '<span class="mu">V</span>'); ge('mlt').style.color = lc2;
      si('mam', e.amp.toFixed(1) + '<span class="mu">A</span>');
      si('mkw', kw + '<span class="mu">kW</span>');
      var fqc = (e.freq > 49.5 && e.freq < 50.5) ? '#ffe57f' : 'var(--rd)';
      si('mfq', e.freq.toFixed(2) + '<span class="mu">Hz</span>'); ge('mfq').style.color = fqc;
      ge('mpf').textContent = e.pf.toFixed(3);
      ge('mpf').style.color = e.pf > 0.9 ? '#ffd54f' : e.pf > 0.8 ? 'var(--ye)' : 'var(--rd)';
      si('mfl', '+/-' + e.fluct.toFixed(1) + '<span class="mu">V</span>');
      ge('mfl').style.color = e.fluct < 5 ? '#ffe57f' : e.fluct < 12 ? 'var(--ye)' : 'var(--rd)';
      var wp = bWaste[i], wcp = WTCAP[i];
      ge('wring').style.strokeDashoffset = 182.2 * (1 - wp / 100);
      var wclr = wp > 80 ? 'var(--rd)' : wp > 60 ? 'var(--ye)' : 'var(--gn)';
      ge('wring').style.stroke = wp > 80 ? '#ff1744' : wp > 60 ? '#ffd600' : '#00e676';
      ge('wpct').textContent = Math.round(wp) + '%'; ge('wpct').style.color = wclr;
      ge('wvl').textContent = Math.round(wcp * wp / 100).toLocaleString() + ' L';
      ge('wcp').textContent = wcp.toLocaleString() + ' L';
      ge('wdt').className = 'dt ' + (wp > 80 ? 'cr' : wp > 60 ? 'wn' : 'ok');
      ge('wst').textContent = wp > 80 ? 'CRITICAL' : wp > 60 ? 'HIGH LOAD' : 'NORMAL';
      ge('wst').style.color = wclr;
      var crit = -1;
      for (var ii = 0; ii < 4; ii++) { if (bWaste[ii] > 88) crit = ii; }
      if (crit >= 0) { ge('abl').textContent = BLID[crit]; ge('alrt').classList.add('on'); }
      else ge('alrt').classList.remove('on');
      drawWave();
    }
 
    // ============================================================
    //  BLOCK SELECTION (unchanged)
    // ============================================================
    function selBlock(i) {
      active = i;
      var btns = document.querySelectorAll('.bb');
      for (var b = 0; b < btns.length; b++)btns[b].classList.toggle('on', b === i);
      ge('dbn').textContent = 'BLOCK ' + BLID[i] + ' \u2014 ' + BLNM[i];
      ge('dsub').textContent = 'Water: ' + WCAP[i].toLocaleString() + 'L  Waste: ' + WTCAP[i].toLocaleString() + 'L  11kV HT';
      selSpt.position.set(bPos[i][0], bH[i] + 20, bPos[i][1] + 10);
      selTgt.position.set(bPos[i][0], bH[i] / 2, bPos[i][1]);
      selSpt.intensity = isDark ? 2.5 : 0;
      for (var t = 0; t < tAccLts.length; t++)tAccLts[t].intensity = (t === i && isDark) ? 2.5 : 0;
      animCam(Math.atan2(bPos[i][0], bPos[i][1]) + 0.3, sP);
      ge('slw').value = Math.round(bWater[i]);
      ge('slwt').value = Math.round(bWaste[i]);
      ge('svw').textContent = Math.round(bWater[i]) + '%';
      ge('svwt').textContent = Math.round(bWaste[i]) + '%';
      waveH = []; renderDash();
    }
 
    function setWater(v) { bWater[active] = v; ge('svw').textContent = Math.round(v) + '%'; upd3DWater(active, v); renderDash(); }
    function setWaste(v) { bWaste[active] = v; ge('svwt').textContent = Math.round(v) + '%'; upd3DWaste(active); renderDash(); }
 
    // ============================================================
    //  THEME TOGGLE
    // ============================================================
    function toggleTheme() {
      isDark = !isDark;
      document.body.className = isDark ? 'dark' : 'light';
      scene.background.setHex(isDark ? 0x0a1628 : 0x8ec8f0);
      scene.fog.color.setHex(isDark ? 0x0a1020 : 0xb0d8f0);
      renderer.toneMappingExposure = isDark ? 0.75 : 1.15;
      // Ground
      gndMat.color.setHex(isDark ? 0x0c1e0c : 0x4da835);
      if (gndMat.map) gndMat.needsUpdate = true;
      // Lights
      sceneAmb.color.setHex(isDark ? 0x162840 : 0xfff8e8);
      sceneAmb.intensity = isDark ? 0.4 : 0.55;
      sceneSun.color.setHex(isDark ? 0x8899bb : 0xfff0cc);
      sceneSun.intensity = isDark ? 1.2 : 3.8;
      sceneFill.intensity = isDark ? 0.3 : 0.6;
      sceneHemi.color.setHex(isDark ? 0x1a3a88 : 0x87ceeb);
      sceneHemi.groundColor.setHex(isDark ? 0x0a1a06 : 0x4a8f2a);
      sceneHemi.intensity = isDark ? 0.4 : 0.7;
      // Spotlight & accent
      selSpt.intensity = isDark ? 2.5 : 0;
      for (var t = 0; t < tAccLts.length; t++)tAccLts[t].intensity = (t === active && isDark) ? 2.5 : 0;
      // Walkway lamps — brighter in dark, dimmer in light
      applyLightState();
      ge('tbtn').textContent = isDark ? '\u2600 LIGHT MODE' : '\uD83C\uDF19 DARK MODE';
    }
 
    // ============================================================
    //  LIGHT TOGGLE
    // ============================================================
    function applyLightState() {
      // SpotLights down onto walkways
      var spotInt = lightsOn ? (isDark ? 5.5 : 2.5) : 0;
      for (var w = 0; w < walkLights.length; w++) {
        walkLights[w].intensity = spotInt;
      }
      // Bulb emissive glow
      var bulbEm = lightsOn ? (isDark ? 8.0 : 5.0) : 0.15;
      for (var w = 0; w < walkBulbs.length; w++) {
        walkBulbs[w].emissiveIntensity = bulbEm;
      }
      // Path surface emissive — warm amber glow on the path material itself
      var pathEm = lightsOn ? (isDark ? 0.28 : 0.08) : 0;
      var pathColor = lightsOn ? 0xffe8a0 : 0x000000;
      for (var p = 0; p < pathMats.length; p++) {
        pathMats[p].emissive.setHex(pathColor);
        pathMats[p].emissiveIntensity = pathEm;
      }
      // Button label
      var btn = ge('lbtn');
      if (btn) {
        btn.textContent = lightsOn ? '\uD83D\uDCA1 LIGHTS ON' : '\uD83D\uDD26 LIGHTS OFF';
        btn.style.color = lightsOn ? '#ffe840' : '#607870';
        btn.style.borderColor = lightsOn ? 'rgba(255,238,80,.5)' : 'rgba(80,120,100,.3)';
      }
    }
 
    function toggleLights() {
      lightsOn = !lightsOn;
      applyLightState();
    }
    function openDashboard() {
      var d = ge('bigdash'); if (!d) return;
      d.classList.add('vis');
      bdRenderFull();
    }
 
    // ============================================================
    //  CLOCK
    // ============================================================
    function tickClk() {
      var n = new Date();
      var t = n.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      var d = n.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      ge('clkd').textContent = d + '  ' + t; ge('dts').textContent = t;
    }
 
    // ============================================================
    //  RENDER LOOP
    // ============================================================
    var frm = 0;
    function loop() {
      requestAnimationFrame(loop); frm++;
      for (var i = 0; i < wMeshes.length; i++)wMeshes[i].mat.emissiveIntensity = 0.4 + Math.sin(frm * 0.04 + i * 1.4) * 0.2;
      for (var i = 0; i < wFMats.length; i++)wFMats[i].emissiveIntensity = 0.3 + Math.sin(frm * 0.055 + i * 0.9) * 0.12;
      if (lightsOn) {
        var bEm = isDark ? 8.0 : 5.0;
        var sInt = isDark ? 5.5 : 2.5;
        var pEm = isDark ? 0.28 : 0.08;
        for (var w = 0; w < walkBulbs.length; w++) {
          walkBulbs[w].emissiveIntensity = bEm + Math.sin(frm * 0.13 + w * 0.55) * 0.5;
        }
        for (var w = 0; w < walkLights.length; w++) {
          walkLights[w].intensity = sInt + Math.sin(frm * 0.11 + w * 0.65) * 0.3;
        }
        for (var p = 0; p < pathMats.length; p++) {
          pathMats[p].emissiveIntensity = pEm + Math.sin(frm * 0.08 + p * 1.2) * 0.025;
        }
      }
      renderer.render(scene, camera);
    }
 
    // ============================================================
    //  START
    // ============================================================
    window.onload = function () {
      initScene();
      applyCam();
      startOrbit();
      for (var i = 0; i < 4; i++) { upd3DWater(i, bWater[i]); upd3DWaste(i); }
      selBlock(0);
      simElec(); renderDash();
      applyLightState();
      setInterval(simTick, 500);
      setInterval(simElec, 2500);
      setInterval(tickClk, 1000);
      tickClk();
      loop();
    };
 
    // ═══════════════════════════════════════════════════════
    //  INTEGRATED DASHBOARD
    // ═══════════════════════════════════════════════════════
    var BD = { block: 0, view: 'block', mode: 'water', range: 'live' };
    var HIST_MAX = 90;
    var histLbl = [], histW = [[], [], [], []], histWt = [[], [], [], []], histKw = [[], [], [], []];
    var bdChart = null;
    var BCOL = ['#3b82f6', '#f97316', '#22c55e', '#a855f7'];
    var BSHORT = ['Engineering', 'Science', 'Admin', 'Hostel'];
 
    function bdPushHistory() {
      var n = new Date();
      var lbl = n.getHours().toString().padStart(2, '0') + ':' +
        n.getMinutes().toString().padStart(2, '0') + ':' +
        n.getSeconds().toString().padStart(2, '0');
      histLbl.push(lbl);
      if (histLbl.length > HIST_MAX) histLbl.shift();
      for (var i = 0; i < 4; i++) {
        histW[i].push(parseFloat(bWater[i].toFixed(2)));
        histWt[i].push(parseFloat(bWaste[i].toFixed(2)));
        histKw[i].push(parseFloat(getKW(i)));
        if (histW[i].length > HIST_MAX) histW[i].shift();
        if (histWt[i].length > HIST_MAX) histWt[i].shift();
        if (histKw[i].length > HIST_MAX) histKw[i].shift();
      }
      if (ge('bigdash') && ge('bigdash').classList.contains('vis')) {
        bdTickUpdate();
      }
    }
 
    function bdGe(id) { return document.getElementById(id); }
    function bdSi(id, h) { var e = bdGe(id); if (e) e.innerHTML = h; }
    function rgbaOf(hex, a) {
      var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    }
    function fmtNum(n, d) { return parseFloat(n.toFixed(d || 0)).toLocaleString(); }
    function clampV(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function bdLF() { var h = new Date().getHours(); return (h >= 9 && h <= 18) ? 1.0 : (h >= 7 && h <= 21) ? 0.7 : 0.3; }
 
    // ── Seeded pseudo-random so charts look same each render but still vary per block
    function seededRand(seed) {
      var x = Math.sin(seed + 1) * 43758.5453123;
      return x - Math.floor(x);
    }
 
    // ── Realistic hourly water usage profiles per block type (L/hr)
    // Engineering: big morning rush 8-10, lunch 12-13, evening 17-19, low nights
    // Science:     spread through day, peaks at 9,13,16
    // Admin:       office hours only, 9-17, quiet after 5
    // Hostel:      heavy morning 6-9, big evening 18-22, low midday
    var WATER_PROFILES = [
      // Engineering — [0..23]
      [18, 12, 8, 6, 5, 5, 12, 38, 95, 88, 72, 65, 82, 70, 68, 72, 85, 90, 75, 55, 38, 28, 22, 18],
      // Science
      [10, 7, 5, 4, 4, 5, 8, 22, 65, 78, 70, 58, 72, 68, 60, 75, 65, 55, 42, 30, 22, 16, 12, 10],
      // Admin
      [5, 3, 3, 2, 2, 2, 4, 12, 55, 62, 58, 52, 65, 60, 58, 55, 52, 28, 15, 10, 8, 6, 5, 5],
      // Hostel
      [28, 18, 12, 8, 6, 5, 20, 78, 95, 82, 60, 48, 52, 58, 55, 48, 42, 68, 110, 128, 118, 95, 68, 42]
    ];
    // ── Realistic hourly electricity profiles (kW)
    var ELEC_PROFILES = [
      // Engineering
      [8, 6, 5, 5, 5, 5, 7, 14, 38, 42, 40, 36, 34, 36, 38, 40, 42, 36, 28, 18, 12, 10, 9, 8],
      // Science
      [5, 4, 3, 3, 3, 4, 5, 10, 28, 32, 30, 28, 26, 28, 30, 32, 28, 22, 15, 10, 7, 6, 5, 5],
      // Admin
      [4, 3, 2, 2, 2, 2, 3, 8, 22, 26, 24, 22, 24, 26, 24, 22, 18, 10, 6, 5, 4, 4, 3, 4],
      // Hostel
      [22, 16, 12, 10, 9, 8, 14, 28, 38, 36, 32, 28, 26, 28, 30, 28, 26, 38, 52, 58, 54, 44, 34, 26]
    ];
    // ── Realistic hourly waste profiles (L/hr, ~65% of water usage)
    // Just derive from water profiles with slight variation
 
    function synthHr(bi, mode) {
      var vals = [];
      var seed = bi * 100 + (mode === 'water' ? 0 : mode === 'electricity' ? 1 : 2);
      for (var h = 0; h < 24; h++) {
        var base;
        if (mode === 'water') {
          base = WATER_PROFILES[bi][h];
          // Scale to block capacity
          base = base * (WCAP[bi] / 15000);
        } else if (mode === 'electricity') {
          base = ELEC_PROFILES[bi][h];
          // Scale to block amp rating
          base = base * (EBASE[bi].amp / 48);
        } else {
          // Waste: based on water but with more lag and spikes
          base = WATER_PROFILES[bi][h] * (WCAP[bi] / 15000) * 0.65;
        }
        // Add realistic noise: ±15% + occasional spike/dip
        var r1 = seededRand(seed + h * 7);
        var r2 = seededRand(seed + h * 13 + 5);
        var noise = (r1 - 0.5) * 0.28;           // ±14% base noise
        var spike = r2 > 0.88 ? (r1 * 0.35) :       // 12% chance: +0~35% spike
          r2 < 0.08 ? -(r1 * 0.25) : 0;    // 8% chance: -0~25% dip
        base = Math.max(0, base * (1 + noise + spike));
        vals.push(parseFloat(base.toFixed(1)));
      }
      return vals;
    }
 
    function synthWeek(bi, mode) {
      // Block-specific weekly patterns
      // Engineering: Mon-Fri full, Sat 50%, Sun 20%
      // Science:     Mon-Fri full, Sat 60%, Sun 30%
      // Admin:       Mon-Fri full, Sat 20%, Sun 5% (offices closed)
      // Hostel:      Mon-Sun fairly consistent, Fri-Sat slightly higher (events)
      var dayScales = [
        [1.0, 0.95, 0.98, 1.05, 0.92, 0.50, 0.20], // Engineering
        [1.0, 0.95, 1.02, 0.98, 0.90, 0.60, 0.30], // Science
        [1.0, 1.05, 0.98, 1.02, 0.95, 0.18, 0.05], // Admin
        [0.95, 0.92, 0.95, 0.98, 1.05, 1.10, 1.0]  // Hostel (higher Fri-Sat)
      ];
      var dailyBase = synthHr(bi, mode).reduce(function (a, b) { return a + b; }, 0);
      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(function (_, d) {
        var sc = dayScales[bi][d];
        var noise = (seededRand(bi * 37 + d * 11) - 0.5) * 0.18; // ±9% day-to-day variation
        return Math.max(0, parseFloat((dailyBase * sc * (1 + noise)).toFixed(1)));
      });
    }
 
    function synthMonth(bi, mode) {
      // Monthly: Week 1 usually high (start of month), Week 2-3 normal, Week 4 lower
      // Hostel: Week 1 low (students arrive), Week 2-3 peak, Week 4 exam period = higher
      var weekScales = [
        [1.05, 1.02, 0.98, 0.92], // Engineering
        [1.02, 1.05, 0.98, 0.90], // Science
        [1.0, 1.02, 1.05, 0.95], // Admin
        [0.82, 1.05, 1.10, 1.15]  // Hostel (fills up through month)
      ];
      var weeklyBase = synthWeek(bi, mode).reduce(function (a, b) { return a + b; }, 0);
      return ['Week 1', 'Week 2', 'Week 3', 'Week 4'].map(function (_, w) {
        var sc = weekScales[bi][w];
        var noise = (seededRand(bi * 53 + w * 19) - 0.5) * 0.14; // ±7% week-to-week
        return Math.max(0, parseFloat((weeklyBase * sc * (1 + noise)).toFixed(1)));
      });
    }
 
    function bdDefaults() {
      var dark = !document.body.classList.contains('light');
      return {
        gc: dark ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.05)',
        tc: dark ? '#4a5a7a' : '#7a8a9a',
        tt: {
          backgroundColor: dark ? 'rgba(5,12,25,.97)' : 'rgba(255,255,255,.97)',
          titleColor: dark ? '#c8d4e8' : '#0f172a', bodyColor: dark ? '#7a90b8' : '#475569',
          borderColor: dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)',
          borderWidth: 1, padding: 11, cornerRadius: 9, displayColors: true, boxWidth: 10, boxHeight: 10
        }
      };
    }
    function mkGrad(ctx, color, h) {
      h = h || 240; var g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, rgbaOf(color, .32)); g.addColorStop(1, rgbaOf(color, .01)); return g;
    }
    function bdBaseOpts(yUnit, legend, yMin, yMax) {
      var d = bdDefaults();
      var maxTicks = BD.range === 'live' ? 8 : BD.range === 'daily' ? 12 : 7;
      return {
        responsive: true, maintainAspectRatio: false, animation: { duration: 0 },
        plugins: {
          legend: {
            display: !!legend, labels: {
              color: d.tc, font: { size: 11, family: "'Rajdhani',sans-serif" },
              boxWidth: 12, padding: 14, usePointStyle: true, pointStyleWidth: 8
            }
          },
          tooltip: {
            mode: 'index', intersect: false,
            backgroundColor: d.tt.backgroundColor, titleColor: d.tt.titleColor,
            bodyColor: d.tt.bodyColor, borderColor: d.tt.borderColor,
            borderWidth: 1, padding: 11, cornerRadius: 9, displayColors: true,
            boxWidth: 10, boxHeight: 10,
            callbacks: {
              label: function (c) { return ' ' + c.dataset.label + ': ' + c.parsed.y.toLocaleString() + ' ' + yUnit; },
              afterBody: function (items) {
                if (!items.length) return '';
                var vals = items.map(function (c) { return c.parsed.y; });
                var mx = Math.max.apply(null, vals), mn = Math.min.apply(null, vals);
                if (items.length === 1) return '';
                return ['', '⬆ Max: ' + mx.toLocaleString() + ' ' + yUnit, '⬇ Min: ' + mn.toLocaleString() + ' ' + yUnit];
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: d.gc, drawBorder: false }, border: { display: false },
            ticks: { color: d.tc, font: { size: 9.5 }, maxRotation: 0, maxTicksLimit: maxTicks, autoSkip: true }
          },
          y: {
            grid: { color: d.gc, drawBorder: false }, border: { display: false },
            ticks: {
              color: d.tc, font: { size: 9.5 },
              callback: function (v) { return v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toLocaleString(); }
            },
            ...(yMin != null ? { min: yMin } : {}),
            ...(yMax != null ? { max: yMax } : {})
          }
        }
      };
    }
    function bdMkChart(id, config) {
      if (bdChart) { bdChart.destroy(); bdChart = null; }
      var el = bdGe(id); if (!el) return;
      bdChart = new Chart(el, config);
    }
 
    // Live chart configs
    function bdLiveConfig(bi) {
      var col = BCOL[bi];
      var hist = BD.mode === 'water' ? histW[bi] : BD.mode === 'electricity' ? histKw[bi] : histWt[bi];
      var yUnit = BD.mode === 'electricity' ? 'kW' : '%';
      var yMax = BD.mode === 'electricity' ? null : 100;
      var el = bdGe('bdChart'); if (!el) return null;
      var ctx = el.getContext('2d');
      var g = mkGrad(ctx, col, 240);
      var opts = bdBaseOpts(yUnit, false, 0, yMax);
      // Show small points on live chart so you can see each reading
      opts.plugins.tooltip.callbacks.label = function (c) {
        return ' ' + c.dataset.label + ': ' + c.parsed.y.toFixed(2) + ' ' + yUnit;
      };
      return {
        type: 'line', data: {
          labels: histLbl.slice(), datasets: [{
            label: { water: 'Water Level', electricity: 'Active Power', waste: 'Waste Level' }[BD.mode],
            data: hist.slice(),
            borderColor: col, backgroundColor: g, borderWidth: 2,
            tension: 0.3,
            pointRadius: function (ctx2) {
              // Show a point every ~6th reading to avoid clutter but show variation
              return ctx2.dataIndex % 6 === 0 ? 4 : 2;
            },
            pointHoverRadius: 7,
            pointBackgroundColor: col,
            pointBorderColor: 'rgba(255,255,255,.7)',
            pointBorderWidth: 1,
            fill: true
          }]
        }, options: opts
      };
    }
    function bdSynthConfig(bi) {
      var col = BCOL[bi]; var labels, data, type = 'line', bRad = 0, yUnit;
      if (BD.range === 'daily') {
        labels = Array.from({ length: 24 }, function (_, h) {
          if (h === 0) return '12 AM';
          if (h < 12) return h + ' AM';
          if (h === 12) return '12 PM';
          return (h - 12) + ' PM';
        });
        data = synthHr(bi, BD.mode);
        yUnit = BD.mode === 'electricity' ? 'kW' : 'L';
      } else if (BD.range === 'weekly') {
        labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        data = synthWeek(bi, BD.mode);
        yUnit = BD.mode === 'electricity' ? 'kWh' : 'L'; type = 'bar'; bRad = 7;
      } else {
        labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
        data = synthMonth(bi, BD.mode);
        yUnit = BD.mode === 'electricity' ? 'kWh' : 'L'; type = 'bar'; bRad = 9;
      }
      var el = bdGe('bdChart'); if (!el) return null;
      var ctx = el.getContext('2d');
      var g = mkGrad(ctx, col, 240);
      var opts = bdBaseOpts(yUnit, false, 0);
      // Find peak and min indices for annotation
      var maxV = Math.max.apply(null, data), minV = Math.min.apply(null, data);
      var maxIdx = data.indexOf(maxV), minIdx = data.indexOf(minV);
      if (type === 'line') {
        opts.plugins.tooltip.callbacks.label = function (c) {
          var suffix = c.dataIndex === maxIdx ? ' ▲ PEAK' : c.dataIndex === minIdx ? ' ▼ MIN' : '';
          return ' ' + c.dataset.label + ': ' + c.parsed.y.toLocaleString() + ' ' + yUnit + suffix;
        };
        // Datalabels via afterDraw plugin — we'll use pointLabel trick instead
        opts.plugins.datalabels = false; // disable if plugin present
      } else {
        opts.plugins.tooltip.callbacks.label = function (c) {
          return ' ' + c.dataset.label + ': ' + c.parsed.y.toLocaleString() + ' ' + yUnit;
        };
      }
      return {
        type: type, data: {
          labels: labels, datasets: [{
            label: BSHORT[bi] + ' Block',
            data: data,
            borderColor: col,
            backgroundColor: type === 'line' ? g : data.map(function (v, idx) {
              // Color bars by value: peak=accent, min=muted, rest=normal
              return v === maxV ? col : v === minV ? rgbaOf(col, .4) : rgbaOf(col, .68);
            }),
            borderWidth: type === 'line' ? 2.5 : 0,
            borderRadius: bRad,
            tension: 0.35,
            pointRadius: type === 'line' ? data.map(function (v, idx) {
              return (v === maxV || v === minV) ? 8 : 4;  // bigger dot at peak/min
            }) : 0,
            pointHoverRadius: 9,
            pointBackgroundColor: type === 'line' ? data.map(function (v) {
              return v === maxV ? '#fff' : v === minV ? rgbaOf(col, .6) : col;
            }) : col,
            pointBorderColor: col,
            pointBorderWidth: type === 'line' ? data.map(function (v) {
              return (v === maxV || v === minV) ? 2 : 1;
            }) : 0,
            fill: type === 'line'
          }]
        }, options: opts
      };
    }
    function bdMasterConfig() {
      var labels, datasets = [], type = 'line', bRad = 0, yUnit;
      if (BD.range === 'live') {
        labels = histLbl.slice(); yUnit = BD.mode === 'electricity' ? 'kW' : '%';
        BLID.forEach(function (_, i) {
          var h = BD.mode === 'water' ? histW[i] : BD.mode === 'electricity' ? histKw[i] : histWt[i];
          datasets.push({
            label: 'Block ' + BLID[i] + ' (' + BSHORT[i] + ')', data: h.slice(),
            borderColor: BCOL[i], backgroundColor: rgbaOf(BCOL[i], .0),
            borderWidth: 2, tension: 0.3,
            pointRadius: h.map(function (_, idx) { return idx % 8 === 0 ? 3 : 1; }),
            pointHoverRadius: 6,
            pointBackgroundColor: BCOL[i],
            pointBorderColor: 'rgba(255,255,255,.5)',
            pointBorderWidth: 1,
            fill: false
          });
        });
      } else if (BD.range === 'daily') {
        labels = Array.from({ length: 24 }, function (_, h) {
          if (h === 0) return '12 AM'; if (h < 12) return h + ' AM';
          if (h === 12) return '12 PM'; return (h - 12) + ' PM';
        });
        yUnit = BD.mode === 'electricity' ? 'kW' : 'L';
        BLID.forEach(function (_, i) {
          var d = synthHr(i, BD.mode);
          var maxV = Math.max.apply(null, d);
          datasets.push({
            label: 'Block ' + BLID[i] + ' (' + BSHORT[i] + ')', data: d,
            borderColor: BCOL[i], backgroundColor: rgbaOf(BCOL[i], .0),
            borderWidth: 2, tension: 0.35,
            pointRadius: d.map(function (v) { return v === maxV ? 6 : 3; }),
            pointHoverRadius: 7,
            pointBackgroundColor: d.map(function (v) { return v === maxV ? '#fff' : BCOL[i]; }),
            pointBorderColor: BCOL[i], pointBorderWidth: d.map(function (v) { return v === maxV ? 2 : 1; }),
            fill: false
          });
        });
      } else if (BD.range === 'weekly') {
        labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        yUnit = BD.mode === 'electricity' ? 'kWh' : 'L'; type = 'bar'; bRad = 5;
        BLID.forEach(function (_, i) {
          datasets.push({
            label: 'Block ' + BLID[i], data: synthWeek(i, BD.mode),
            backgroundColor: rgbaOf(BCOL[i], .75), borderRadius: bRad, borderWidth: 0
          });
        });
      } else {
        labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
        yUnit = BD.mode === 'electricity' ? 'kWh' : 'L'; type = 'bar'; bRad = 7;
        BLID.forEach(function (_, i) {
          datasets.push({
            label: 'Block ' + BLID[i], data: synthMonth(i, BD.mode),
            backgroundColor: rgbaOf(BCOL[i], .75), borderRadius: bRad, borderWidth: 0
          });
        });
      }
      var opts = bdBaseOpts(yUnit, true, 0, BD.range === 'live' && BD.mode !== 'electricity' ? 100 : undefined);
      opts.plugins.tooltip.callbacks.label = function (c) {
        return ' ' + c.dataset.label + ': ' + c.parsed.y.toLocaleString() + ' ' + yUnit;
      };
      return { type: type, data: { labels: labels, datasets: datasets }, options: opts };
    }
    function bdProjConfig(bi) {
      var nowH = new Date().getHours(), wPct = bWater[bi];
      var lbl = ['Now'], proj = [parseFloat(wPct.toFixed(1))], cur = wPct;
      for (var h = 1; h <= 12; h++) {
        lbl.push(h + 'h');
        var hh = (nowH + h) % 24; var l = (hh >= 9 && hh <= 18) ? 1.0 : (hh >= 7 && hh <= 21) ? 0.7 : 0.3;
        cur = Math.max(0, cur - DRAIN_RATE[bi] * l * 3600);
        if (cur <= 8) cur = Math.min(100, cur + 30);
        proj.push(parseFloat(cur.toFixed(1)));
      }
      var el = bdGe('bdChart'); if (!el) return null;
      var g = mkGrad(el.getContext('2d'), '#3b82f6', 240);
      var d = bdDefaults();
      return {
        type: 'line', data: {
          labels: lbl, datasets: [
            {
              label: 'Projected Water %', data: proj, borderColor: '#3b82f6', backgroundColor: g,
              borderWidth: 2.5, tension: 0.4, pointRadius: 4, pointHoverRadius: 7,
              pointBackgroundColor: '#3b82f6', fill: true
            },
            {
              label: 'Critical (10%)', data: Array(13).fill(10), borderColor: 'rgba(239,68,68,.5)',
              backgroundColor: 'rgba(239,68,68,.04)', borderWidth: 1.5, pointRadius: 0,
              fill: '-1', borderDash: [5, 4]
            }
          ]
        }, options: {
          responsive: true, maintainAspectRatio: false, animation: { duration: 300 },
          plugins: {
            legend: {
              display: true, labels: {
                color: d.tc, font: { size: 11 }, boxWidth: 12,
                padding: 14, usePointStyle: true, pointStyleWidth: 8
              }
            },
            tooltip: {
              mode: 'index', intersect: false, backgroundColor: d.tt.backgroundColor,
              titleColor: d.tt.titleColor, bodyColor: d.tt.bodyColor,
              borderColor: d.tt.borderColor, borderWidth: 1, padding: 11, cornerRadius: 9,
              callbacks: { label: function (c) { return ' ' + c.dataset.label + ': ' + c.parsed.y.toFixed(1) + '%'; } }
            }
          },
          scales: {
            x: {
              grid: { color: d.gc, drawBorder: false }, border: { display: false },
              ticks: { color: d.tc, font: { size: 9.5 } }
            },
            y: {
              min: 0, max: 100, grid: { color: d.gc, drawBorder: false }, border: { display: false },
              ticks: { color: d.tc, font: { size: 9.5 }, callback: function (v) { return v + '%'; } }
            }
          }
        }
      };
    }
 
    // Live tick update (no full re-render)
    function bdTickUpdate() {
      bdUpdateKPIs();
      if (BD.range === 'live' && bdChart) {
        if (BD.view === 'block') {
          var h = BD.mode === 'water' ? histW[BD.block] : BD.mode === 'electricity' ? histKw[BD.block] : histWt[BD.block];
          bdChart.data.labels = histLbl.slice();
          bdChart.data.datasets[0].data = h.slice();
          bdChart.update('none');
        } else if (BD.view === 'master') {
          bdChart.data.labels = histLbl.slice();
          BLID.forEach(function (_, i) {
            var h = BD.mode === 'water' ? histW[i] : BD.mode === 'electricity' ? histKw[i] : histWt[i];
            if (bdChart.data.datasets[i]) bdChart.data.datasets[i].data = h.slice();
          });
          bdChart.update('none');
        } else if (BD.view === 'analysis') {
          bdUpdateAnalysisMetrics();
        }
      }
      bdUpdSidebar();
    }
    function bdUpdateKPIs() {
      var i = BD.block, m = BD.mode;
      if (m === 'water') {
        var wl = bWater[i];
        bdSi('bdkv0', wl.toFixed(1) + '<span class="u"> %</span>');
        bdSi('bdks0', Math.round(WCAP[i] * wl / 100).toLocaleString() + ' L / ' + WCAP[i].toLocaleString() + ' L');
        bdSi('bdkv1', pbar(wl) + '<span class="u"> bar</span>');
        bdSi('bdkv2', getPur(i) + '<span class="u"> %</span>');
      } else if (m === 'electricity') {
        var e = elec[i];
        bdSi('bdkv0', getKW(i) + '<span class="u"> kW</span>');
        bdSi('bdks0', e.ht.toFixed(3) + ' kV &middot; 3-Phase &middot; ' + e.freq.toFixed(2) + ' Hz');
        bdSi('bdkv1', e.lt + '<span class="u"> V</span>');
        bdSi('bdkv2', e.pf.toFixed(3));
      } else {
        var wt = bWaste[i];
        bdSi('bdkv0', wt.toFixed(1) + '<span class="u"> %</span>');
        bdSi('bdks0', Math.round(WTCAP[i] * wt / 100).toLocaleString() + ' L / ' + WTCAP[i].toLocaleString() + ' L');
        var fr = (DRAIN_RATE[i] * bdLF() * 3600 * WCAP[i] / 100 * 0.65).toFixed(1);
        bdSi('bdkv1', fr + '<span class="u"> L/hr</span>');
        var rem = parseFloat(fr) > 0 ? ((100 - wt) / parseFloat(fr)).toFixed(1) : '--';
        bdSi('bdkv2', rem + '<span class="u"> hrs</span>');
      }
      BLID.forEach(function (_, ii) {
        var mv = bdGe('bdmcv' + ii), ms = bdGe('bdmcs' + ii); if (!mv) return;
        var val, sub;
        if (BD.mode === 'water') { val = bWater[ii].toFixed(1) + '%'; sub = Math.round(WCAP[ii] * bWater[ii] / 100).toLocaleString() + ' L'; }
        else if (BD.mode === 'electricity') { val = getKW(ii) + ' kW'; sub = elec[ii].lt + ' V | ' + elec[ii].freq.toFixed(1) + ' Hz'; }
        else { val = bWaste[ii].toFixed(1) + '%'; sub = Math.round(WTCAP[ii] * bWaste[ii] / 100).toLocaleString() + ' L'; }
        mv.innerHTML = val; ms.textContent = sub;
      });
    }
    function bdUpdateAnalysisMetrics() {
      var i = BD.block, lf = bdLF();
      var drPH = DRAIN_RATE[i] * lf * 3600, fillPH = drPH * 0.65;
      var wH = drPH > 0 ? clampV(bWater[i] / drPH, 0, 999) : 999;
      var wtH = fillPH > 0 ? clampV((100 - bWaste[i]) / fillPH, 0, 999) : 999;
      bdSi('bdpv0', (wH >= 1 ? wH.toFixed(1) : Math.round(wH * 60)) + '<span class="bd-pred-unit"> ' + (wH >= 1 ? 'hrs' : 'min') + '</span>');
      bdSi('bdpv1', (wtH >= 1 ? wtH.toFixed(1) : Math.round(wtH * 60)) + '<span class="bd-pred-unit"> ' + (wtH >= 1 ? 'hrs' : 'min') + '</span>');
      if (bdChart) {
        var nowH = new Date().getHours(), cur = bWater[i], proj = [];
        for (var h = 0; h <= 12; h++) {
          if (h > 0) {
            var hh = (nowH + h) % 24; var l = (hh >= 9 && hh <= 18) ? 1.0 : (hh >= 7 && hh <= 21) ? 0.7 : 0.3;
            cur = Math.max(0, cur - DRAIN_RATE[i] * l * 3600); if (cur <= 8) cur = Math.min(100, cur + 30);
          }
          proj.push(parseFloat(cur.toFixed(1)));
        }
        bdChart.data.datasets[0].data = proj; bdChart.update('none');
      }
    }
 
    // Sidebar
    function bdBuildSidebar() {
      var html = BLID.map(function (id, i) {
        var on = (BD.view === 'block' && BD.block === i) ? ' on' : '';
        var wt = bWaste[i]; var dc = wt > 85 ? '#ef4444' : wt > 65 ? '#eab308' : '#22c55e';
        return '<div class="bds-blk' + on + '" id="bdsblk' + i + '" onclick="bdSelBlock(' + i + ')">' +
          '<div class="bds-blk-ico" style="color:' + BCOL[i] + ';background:' + rgbaOf(BCOL[i], .12) + '">' + id + '</div>' +
          '<div style="flex:1;min-width:0">' +
          '<div class="bds-blk-nm">Block ' + id + '</div>' +
          '<div class="bds-blk-sub">' + BSHORT[i] + '</div>' +
          '</div>' +
          '<div class="bds-bdot" id="bddot' + i + '" style="background:' + dc + ';box-shadow:0 0 6px ' + dc + '"></div>' +
          '</div>';
      }).join('');
      var el = bdGe('bd-sb-blocks'); if (el) el.innerHTML = html;
    }
    function bdUpdSidebar() {
      BLID.forEach(function (_, i) {
        var blk = bdGe('bdsblk' + i); if (!blk) return;
        blk.classList.toggle('on', BD.view === 'block' && BD.block === i);
        var dot = bdGe('bddot' + i); if (!dot) return;
        var wt = bWaste[i]; var dc = wt > 85 ? '#ef4444' : wt > 65 ? '#eab308' : '#22c55e';
        dot.style.background = dc; dot.style.boxShadow = '0 0 6px ' + dc;
      });
      var va = bdGe('bdvw-analysis'), vm = bdGe('bdvw-master');
      if (va) va.classList.toggle('on', BD.view === 'analysis');
      if (vm) vm.classList.toggle('on', BD.view === 'master');
    }
    function bdUpdPills() {
      document.querySelectorAll('.bd-p[data-m]').forEach(function (p) { p.classList.toggle('on', p.dataset.m === BD.mode); });
      document.querySelectorAll('.bd-p[data-r]').forEach(function (p) { p.classList.toggle('on', p.dataset.r === BD.range); });
    }
    function bdUpdTitle() {
      var mL = { water: 'Water', electricity: 'Electricity', waste: 'Waste' }[BD.mode];
      var t = BD.view === 'analysis' ? 'Analysis — Block ' + BLID[BD.block] :
        BD.view === 'master' ? 'Master — ' + mL : 'Block ' + BLID[BD.block] + ' — ' + mL;
      bdSi('bdtitle', t);
    }
    function bdUpdClk() {
      var n = new Date();
      var t = n.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      bdSi('bdClk', t);
    }
 
    // Render functions
    function bdRenderBlock() {
      var i = BD.block, m = BD.mode;
      var mC = { water: '#3b82f6', electricity: '#f59e0b', waste: '#22c55e' }[m];
      var mIco = { water: '💧', electricity: '⚡', waste: '🗑️' }[m];
      var k0v, k0s, k0i, k0l, k0badge, k0bc;
      var k1v, k1s, k1i, k1l, k1badge, k1bc;
      var k2v, k2s, k2i, k2l, k2badge, k2bc;
      if (m === 'water') {
        var wl = bWater[i], vol = Math.round(WCAP[i] * wl / 100), pr = pbar(wl), pu = getPur(i);
        k0i = '💧'; k0l = 'Tank Level'; k0v = wl.toFixed(1) + '<span class="u"> %</span>'; k0s = vol.toLocaleString() + ' L / ' + WCAP[i].toLocaleString() + ' L';
        k0badge = wl > 60 ? 'Normal' : wl > 30 ? 'Moderate' : 'Critical'; k0bc = wl > 60 ? 'bdg-g' : wl > 30 ? 'bdg-w' : 'bdg-r';
        k1i = '🔵'; k1l = 'Head Pressure'; k1v = pr + '<span class="u"> bar</span>'; k1s = 'Gravity-fed supply';
        k1badge = parseFloat(pr) > 2 ? 'High' : parseFloat(pr) > 1 ? 'Normal' : 'Low'; k1bc = parseFloat(pr) > 1 ? 'bdg-g' : 'bdg-w';
        k2i = '✅'; k2l = 'Water Quality'; k2v = pu + '<span class="u"> %</span>'; k2s = 'TDS Purity Index';
        k2badge = parseFloat(pu) > 96 ? 'Good' : parseFloat(pu) > 90 ? 'Fair' : 'Poor'; k2bc = parseFloat(pu) > 96 ? 'bdg-g' : parseFloat(pu) > 90 ? 'bdg-w' : 'bdg-r';
      } else if (m === 'electricity') {
        var e2 = elec[i], kw = getKW(i);
        k0i = '⚡'; k0l = 'Active Power'; k0v = kw + '<span class="u"> kW</span>'; k0s = e2.ht.toFixed(3) + ' kV &middot; 3-Phase &middot; ' + e2.freq.toFixed(2) + ' Hz';
        k0badge = 'Live'; k0bc = 'bdg-b';
        k1i = '🔌'; k1l = 'LT Voltage'; k1v = e2.lt + '<span class="u"> V</span>'; k1s = 'Target: 400–430 V';
        k1badge = (e2.lt > 400 && e2.lt < 430) ? 'Stable' : 'Marginal'; k1bc = (e2.lt > 400 && e2.lt < 430) ? 'bdg-g' : 'bdg-w';
        k2i = '📊'; k2l = 'Power Factor'; k2v = e2.pf.toFixed(3); k2s = 'Target ≥ 0.90';
        k2badge = e2.pf > 0.9 ? 'Excellent' : e2.pf > 0.8 ? 'Good' : 'Poor'; k2bc = e2.pf > 0.9 ? 'bdg-g' : e2.pf > 0.8 ? 'bdg-w' : 'bdg-r';
      } else {
        var wt2 = bWaste[i], wtv = Math.round(WTCAP[i] * wt2 / 100);
        var fr2 = (DRAIN_RATE[i] * bdLF() * 3600 * WCAP[i] / 100 * 0.65).toFixed(1);
        var rem2 = parseFloat(fr2) > 0 ? ((100 - wt2) / parseFloat(fr2)).toFixed(1) : '--';
        k0i = '🗑️'; k0l = 'Fill Level'; k0v = wt2.toFixed(1) + '<span class="u"> %</span>'; k0s = wtv.toLocaleString() + ' L / ' + WTCAP[i].toLocaleString() + ' L';
        k0badge = wt2 < 60 ? 'Normal' : wt2 < 80 ? 'High' : 'Critical'; k0bc = wt2 < 60 ? 'bdg-g' : wt2 < 80 ? 'bdg-w' : 'bdg-r';
        k1i = '📈'; k1l = 'Fill Rate'; k1v = fr2 + '<span class="u"> L/hr</span>'; k1s = 'Waste inflow at current usage';
        k1badge = 'Active'; k1bc = 'bdg-b';
        k2i = '⏳'; k2l = 'Time to Full'; k2v = rem2 + '<span class="u"> hrs</span>'; k2s = 'At current fill rate';
        k2badge = parseFloat(rem2) < 3 ? 'Urgent' : parseFloat(rem2) < 8 ? 'Monitor' : 'OK'; k2bc = parseFloat(rem2) < 3 ? 'bdg-r' : parseFloat(rem2) < 8 ? 'bdg-w' : 'bdg-g';
      }
      function mkK(ico, lbl, vid, val, sid, sub, badge, bc, col) {
        return '<div class="bd-kpi bdf" style="border-top:3px solid ' + rgbaOf(col, .4) + ';background:linear-gradient(140deg,' + rgbaOf(col, .07) + ',transparent)">' +
          '<div class="bd-kpi-ico">' + ico + '</div><div class="bd-kpi-lbl">' + lbl + '</div>' +
          '<div class="bd-kpi-val" id="' + vid + '">' + val + '</div>' +
          '<div class="bd-kpi-sub" id="' + sid + '">' + sub + '</div>' +
          '<div class="bd-kpi-badge ' + bc + '">' + badge + '</div></div>';
      }
      var rTag = BD.range === 'live' ? '<div class="bd-live-tag"><div class="bd-live-dot"></div>LIVE</div>' :
        '<div class="bd-range-tag">' + BD.range.toUpperCase() + '</div>';
      var cTitle = BD.range === 'live' ? 'Live ' + { water: 'Water Level %', electricity: 'Active Power (kW)', waste: 'Waste Level %' }[m] + ' — Block ' + BLID[i] :
        { daily: '24-Hour', weekly: '7-Day', monthly: 'Monthly' }[BD.range] + ' ' + { water: 'Water Usage', electricity: 'Power', waste: 'Waste' }[m];
      var cSub = BD.range === 'live' ?
        'Scrolling live &middot; actual simulation readings every 500 ms &middot; dots = sampled readings' :
        BD.range === 'daily' ? '24-hr usage pattern &middot; large dot = peak &middot; hover any point for exact value' :
          BD.range === 'weekly' ? 'Bar height = daily total &middot; darker = higher load day' :
            'Bar height = weekly total &middot; pattern reflects semester/occupancy cycle';
      var mLbl = { water: 'Water', electricity: 'Electricity', waste: 'Waste' }[m];
      bdGe('bdc').innerHTML =
        '<div class="bd-vh bdf"><div><h1>Block ' + BLID[i] + ' &mdash; ' + mLbl + '</h1>' +
        '<p>' + BLNM[i] + ' &middot; All readings sync with 3D simulation every 500 ms</p></div>' +
        '<div class="bd-badge" style="background:' + rgbaOf(mC, .12) + ';color:' + mC + ';border:1px solid ' + rgbaOf(mC, .3) + '">' + mIco + ' ' + m.toUpperCase() + '</div></div>' +
        '<div class="bd-kpis">' + mkK(k0i, k0l, 'bdkv0', k0v, 'bdks0', k0s, k0badge, k0bc, mC) +
        mkK(k1i, k1l, 'bdkv1', k1v, 'bdks1', k1s, k1badge, k1bc, mC) +
        mkK(k2i, k2l, 'bdkv2', k2v, 'bdks2', k2s, k2badge, k2bc, mC) + '</div>' +
        '<div class="bd-cc bdf"><div class="bd-cc-hd">' +
        '<div><div class="bd-cc-title">' + cTitle + '</div>' +
        '<div class="bd-cc-sub">' + cSub + '</div></div>' + rTag + '</div>' +
        '<div class="bd-cw"><canvas id="bdChart"></canvas></div></div>';
      var cfg = BD.range === 'live' ? bdLiveConfig(i) : bdSynthConfig(i);
      if (cfg) bdMkChart('bdChart', cfg);
    }
    function bdRenderAnalysis() {
      var i = BD.block, lf = bdLF();
      var drPH = DRAIN_RATE[i] * lf * 3600, fillPH = drPH * 0.65;
      var wH = drPH > 0 ? clampV(bWater[i] / drPH, 0, 999) : 999;
      var wtH = fillPH > 0 ? clampV((100 - bWaste[i]) / fillPH, 0, 999) : 999;
      var dWL = synthHr(i, 'water').reduce(function (a, b) { return a + b; }, 0);
      var dKwh = synthHr(i, 'electricity').reduce(function (a, b) { return a + b; }, 0);
      function mkP(ico, ttl, vid, val, unit, desc, barPct, barColor, bc, bt, rows) {
        return '<div class="bd-pred bdf">' +
          '<div class="bd-pred-ttl">' + ico + ' &nbsp;' + ttl + '</div>' +
          '<div id="' + vid + '" class="bd-pred-val">' + val + '<span class="bd-pred-unit"> ' + unit + '</span></div>' +
          '<div class="bd-pred-desc">' + desc + '</div>' +
          '<div class="bd-pbar-wrap"><div class="bd-pbar" style="width:' + clampV(barPct * 100, 0, 100) + '%;background:' + barColor + '"></div></div>' +
          '<div class="bd-kpi-badge ' + bc + '" style="margin-top:10px">' + bt + '</div>' +
          (rows ? '<div style="margin-top:12px">' + rows + '</div>' : '') +
          '</div>';
      }
      function ir(l, v) { return '<div class="bd-info-row"><span class="bd-info-l">' + l + '</span><span class="bd-info-v">' + v + '</span></div>'; }
      bdGe('bdc').innerHTML =
        '<div class="bd-vh bdf"><div><h1>Block ' + BLID[i] + ' &mdash; Analysis</h1>' +
        '<p>Predictive analytics &middot; ' + BLNM[i] + ' &middot; Recalculates every 500 ms from live data</p></div>' +
        '<div class="bd-badge" style="background:rgba(168,85,247,.1);color:#c084fc;border:1px solid rgba(168,85,247,.25)">📊 ANALYSIS</div></div>' +
        '<div class="bd-an-grid">' +
        mkP('💧', 'Water Tank — Time to Empty', 'bdpv0',
          (wH >= 1 ? wH.toFixed(1) : Math.round(wH * 60)), (wH >= 1 ? 'hrs' : 'min'),
          'Current: ' + bWater[i].toFixed(1) + '% &middot; Cap: ' + WCAP[i].toLocaleString() + ' L &middot; Drain: ' + drPH.toFixed(1) + '%/hr',
          bWater[i] / 100, '#3b82f6', wH < 2 ? 'bdg-r' : wH < 6 ? 'bdg-w' : 'bdg-g',
          wH < 2 ? 'Refill Urgently' : wH < 6 ? 'Monitor Level' : 'Level Safe',
          ir('Drain Rate', drPH.toFixed(2) + '%/hr') + ir('Volume Now', Math.round(WCAP[i] * bWater[i] / 100).toLocaleString() + ' L') + ir('Refill at', '10%')) +
        mkP('🗑️', 'Waste Tank — Time to Full', 'bdpv1',
          (wtH >= 1 ? wtH.toFixed(1) : Math.round(wtH * 60)), (wtH >= 1 ? 'hrs' : 'min'),
          'Current: ' + bWaste[i].toFixed(1) + '% &middot; Cap: ' + WTCAP[i].toLocaleString() + ' L &middot; Fill: ' + fillPH.toFixed(1) + '%/hr',
          bWaste[i] / 100, '#22c55e', wtH < 2 ? 'bdg-r' : wtH < 6 ? 'bdg-w' : 'bdg-g',
          wtH < 2 ? 'Collection Needed' : wtH < 6 ? 'High Load' : 'OK',
          ir('Fill Rate', fillPH.toFixed(2) + '%/hr') + ir('Collected', Math.round(WTCAP[i] * bWaste[i] / 100).toLocaleString() + ' L') + ir('Critical', '85%')) +
        mkP('📅', 'Daily Water Estimate', 'bdpv2', fmtNum(dWL), 'L/day',
          'Based on ' + BSHORT[i] + ' profile &middot; Peak 9 AM–6 PM accounts for most usage', 0.6, '#3b82f6', 'bdg-g', 'Normal Range',
          ir('Peak (9–6PM)', synthHr(i, 'water').slice(9, 19).reduce(function (a, b) { return a + b; }, 0).toFixed(0) + ' L') +
          ir('Off-peak', synthHr(i, 'water').slice(0, 7).reduce(function (a, b) { return a + b; }, 0).toFixed(0) + ' L') +
          ir('Weekly', fmtNum(synthWeek(i, 'water').reduce(function (a, b) { return a + b; }, 0)) + ' L')) +
        mkP('⚡', 'Daily Electricity Estimate', 'bdpv3', dKwh.toFixed(1), 'kWh/day',
          '3-Phase supply &middot; PF: ' + EBASE[i].pf + ' &middot; Peak: ' + (415 * EBASE[i].amp * 1.732 * EBASE[i].pf / 1000).toFixed(1) + ' kW',
          0.55, '#f59e0b', 'bdg-g', 'Efficient',
          ir('HT', '11 kV &middot; 3-Phase') + ir('Peak Load', (415 * EBASE[i].amp * 1.732 * EBASE[i].pf / 1000).toFixed(1) + ' kW') +
          ir('Off-peak', (415 * EBASE[i].amp * 0.3 * 1.732 * EBASE[i].pf / 1000).toFixed(1) + ' kW')) +
        '</div>' +
        '<div class="bd-cc bdf"><div class="bd-cc-hd">' +
        '<div><div class="bd-cc-title">Water Level Projection — Next 12 Hours</div>' +
        '<div class="bd-cc-sub">Block ' + BLID[i] + ' &middot; Dashed = 10% critical &middot; Recalculates every tick</div></div>' +
        '<div class="bd-live-tag"><div class="bd-live-dot"></div>LIVE</div></div>' +
        '<div class="bd-cw"><canvas id="bdChart"></canvas></div></div>';
      var cfg = bdProjConfig(i); if (cfg) bdMkChart('bdChart', cfg);
    }
    function bdRenderMaster() {
      var m = BD.mode;
      var mL = { water: 'Water', electricity: 'Power', waste: 'Waste' }[m];
      var mC = { water: '#3b82f6', electricity: '#f59e0b', waste: '#22c55e' }[m];
      var mIco = { water: '💧', electricity: '⚡', waste: '🗑️' }[m];
      var minis = BLID.map(function (id, i) {
        var val, sub, col = BCOL[i];
        if (m === 'water') { val = bWater[i].toFixed(1) + '%'; sub = Math.round(WCAP[i] * bWater[i] / 100).toLocaleString() + ' L'; }
        else if (m === 'electricity') { val = getKW(i) + ' kW'; sub = elec[i].lt + ' V | ' + elec[i].freq.toFixed(1) + ' Hz'; }
        else { val = bWaste[i].toFixed(1) + '%'; sub = Math.round(WTCAP[i] * bWaste[i] / 100).toLocaleString() + ' L'; }
        return '<div class="bd-mc bdf" style="border-left-color:' + col + '" onclick="bdSelBlock(' + i + ');bdSelView(\'block\')">' +
          '<div class="bd-mc-id">' + id + ' &middot; ' + BSHORT[i] + '</div>' +
          '<div class="bd-mc-val" id="bdmcv' + i + '" style="color:' + col + '">' + val + '</div>' +
          '<div class="bd-mc-sub" id="bdmcs' + i + '">' + sub + '</div>' +
          '<div class="bd-kpi-badge bdg-b" style="margin-top:6px;font-size:8.5px">⬤ LIVE</div></div>';
      }).join('');
      var leg = '<div class="bd-legend">' + BLID.map(function (id, i) {
        return '<div class="bd-leg-item"><div class="bd-leg-line" style="background:' + BCOL[i] + '"></div>Block ' + id + '</div>';
      }).join('') + '</div>';
      var rLbl = { live: 'Live Stream', daily: '24-Hour', weekly: '7-Day', monthly: 'Monthly' }[BD.range];
      var rTag = BD.range === 'live' ? '<div class="bd-live-tag"><div class="bd-live-dot"></div>LIVE</div>' :
        '<div class="bd-range-tag">' + BD.range.toUpperCase() + '</div>';
      bdGe('bdc').innerHTML =
        '<div class="bd-vh bdf"><div><h1>Master &mdash; ' + { water: 'Water Usage', electricity: 'Power Consumption', waste: 'Waste Level' }[m] + '</h1>' +
        '<p>All campus blocks &middot; ' + rLbl + ' comparison &middot; Click a block card for details</p></div>' +
        '<div class="bd-badge" style="background:rgba(59,130,246,.1);color:#60a5fa;border:1px solid rgba(59,130,246,.25)">' + mIco + ' MASTER</div></div>' +
        '<div class="bd-master-mini">' + minis + '</div>' +
        '<div class="bd-cc bdf"><div class="bd-cc-hd">' +
        '<div><div class="bd-cc-title">' + rLbl + ' ' + { water: 'Water', electricity: 'Power', waste: 'Waste' }[m] + ' — All Blocks</div>' +
        '<div class="bd-cc-sub">All 4 campus blocks &middot; ' + rLbl + ' data &middot; Click legend to toggle</div></div>' +
        leg + rTag + '</div>' +
        '<div class="bd-cw tall"><canvas id="bdChart"></canvas></div></div>';
      var cfg = bdMasterConfig(); if (cfg) bdMkChart('bdChart', cfg);
    }
    function bdRenderFull() {
      if (!ge('bigdash')) return;
      bdUpdPills(); bdUpdTitle(); bdBuildSidebar(); bdUpdSidebar();
      if (BD.view === 'block') bdRenderBlock();
      else if (BD.view === 'analysis') bdRenderAnalysis();
      else bdRenderMaster();
      bdUpdClk();
    }
    function bdSelBlock(i) { BD.block = i; BD.view = 'block'; bdRenderFull(); }
    function bdSelView(v) { BD.view = v; bdRenderFull(); }
    function bdMode(m) { if (BD.mode === m) return; BD.mode = m; bdRenderFull(); }
    function bdRange(r) { if (BD.range === r) return; BD.range = r; bdRenderFull(); }
    function closeDash() { var d = ge('bigdash'); if (d) d.classList.remove('vis'); }
    function bdToggleTheme() {
      document.body.classList.toggle('light');
      var light = document.body.classList.contains('light');
      var btn = bdGe('bdTheme'); if (btn) btn.innerHTML = light ? '🌙 Dark' : '☀ Light';
      bdRenderFull();
    }
    setInterval(bdUpdClk, 1000);
