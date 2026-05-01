    // ============================================================
    //  THREE.JS SCENE — realistic architectural visuals
    // ============================================================
    var scene, camera, renderer;
    var sceneAmb, sceneSun, sceneHemi, sceneFill;
    var gndMat, pathMat;
    var selSpt, selTgt;
    var wMeshes = [];
    var wFMeshes = [];
    var wFMats = [];
    var wFLights = [];
    var tAccLts = [];
    var walkLights = [];
    var walkBulbs = [];
    var pathMats = [];   // path surface materials — toggled emissive when lights on
    var lightsOn = true;
 
    // Layout
    var bPos = [[-32, -30], [32, -30], [-32, 30], [32, 30]];
    var bH = [18, 14, 12, 22];
    var bW = [16, 14, 13, 14];
    var bD = [12, 13, 11, 14];
    var bWingW = [5, 4, 4, 5];   // entrance wing width
    var wPits = [
      [bPos[0][0], bPos[0][1] - bD[0] / 2 - 6],
      [bPos[1][0], bPos[1][1] - bD[1] / 2 - 6],
      [bPos[2][0], bPos[2][1] + bD[2] / 2 + 6],
      [bPos[3][0], bPos[3][1] + bD[3] / 2 + 6]
    ];
    var bAccHex = [0x3a8fe8, 0xe87a20, 0x28c460, 0xa040e0];
    var bAccStr = ['#3a8fe8', '#e87a20', '#28c460', '#a040e0'];
 
    // ── Helper: make canvas texture
    function makeTex(w, h, fn) {
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      fn(c.getContext('2d'), w, h);
      var t = new THREE.CanvasTexture(c);
      return t;
    }
 
    // ── Grass texture
    function makeGrassTex() {
      return makeTex(256, 256, function (ctx, w, h) {
        var g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, '#5cb845'); g.addColorStop(0.5, '#4da838'); g.addColorStop(1, '#58b040');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        for (var i = 0; i < 2400; i++) {
          ctx.fillStyle = 'rgba(' + (40 + Math.random() * 40) + ',' + (120 + Math.random() * 60) + ',' + (30 + Math.random() * 30) + ',.18)';
          var x = Math.random() * w, y = Math.random() * h, r = Math.random() * 3 + 1;
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        }
      });
    }
    // ── Concrete/path texture
    function makePathTex() {
      return makeTex(128, 128, function (ctx, w, h) {
        ctx.fillStyle = '#c8b490'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(180,160,120,.35)'; ctx.lineWidth = 0.8;
        for (var i = 0; i < 6; i++) {
          ctx.beginPath(); ctx.moveTo(i * 22, 0); ctx.lineTo(i * 22, h); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, i * 22); ctx.lineTo(w, i * 22); ctx.stroke();
        }
      });
    }
    // ── Wall texture (cream stucco)
    function makeWallTex() {
      return makeTex(256, 256, function (ctx, w, h) {
        ctx.fillStyle = '#f5f0e5'; ctx.fillRect(0, 0, w, h);
        for (var i = 0; i < 600; i++) {
          ctx.fillStyle = 'rgba(' + (220 + Math.random() * 20) + ',' + (210 + Math.random() * 20) + ',' + (195 + Math.random() * 20) + ',.12)';
          var x = Math.random() * w, y = Math.random() * h;
          ctx.fillRect(x, y, Math.random() * 6 + 1, Math.random() * 6 + 1);
        }
      });
    }
    // ── Terracotta roof tile texture
    function makeRoofTex() {
      return makeTex(128, 128, function (ctx, w, h) {
        ctx.fillStyle = '#d0c4a8'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(180,165,130,.4)'; ctx.lineWidth = 1;
        for (var i = 0; i < 8; i++) {
          ctx.beginPath(); ctx.moveTo(i * 18, 0); ctx.lineTo(i * 18, h); ctx.stroke();
        }
      });
    }
 
    function initScene() {
      var sw = ge('sw'), cv = ge('cv');
      var W = sw.clientWidth, H = sw.clientHeight;
 
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x8ec8f0);
      scene.fog = new THREE.Fog(0xb0d8f0, 140, 320);
 
      camera = new THREE.PerspectiveCamera(48, W / H, 0.5, 600);
      camera.position.set(85, 70, 85);
      camera.lookAt(0, 0, 0);
 
      renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(W, H);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.physicallyCorrectLights = true;
 
      // ── LIGHTS (warm Indian afternoon sun)
      sceneAmb = new THREE.AmbientLight(0xfff8e8, 0.55);
      scene.add(sceneAmb);
 
      sceneSun = new THREE.DirectionalLight(0xfff0cc, 3.8);
      sceneSun.position.set(80, 110, 60);
      sceneSun.castShadow = true;
      sceneSun.shadow.mapSize.width = 4096;
      sceneSun.shadow.mapSize.height = 4096;
      sceneSun.shadow.camera.near = 1;
      sceneSun.shadow.camera.far = 350;
      sceneSun.shadow.camera.left = -120;
      sceneSun.shadow.camera.right = 120;
      sceneSun.shadow.camera.top = 120;
      sceneSun.shadow.camera.bottom = -120;
      sceneSun.shadow.bias = -0.001;
      scene.add(sceneSun);
 
      sceneFill = new THREE.DirectionalLight(0xd0e8ff, 0.6);
      sceneFill.position.set(-60, 40, -50);
      scene.add(sceneFill);
 
      sceneHemi = new THREE.HemisphereLight(0x87ceeb, 0x4a8f2a, 0.7);
      scene.add(sceneHemi);
 
      // Spotlight for selected block
      selSpt = new THREE.SpotLight(0xffffff, 0, 80, Math.PI / 8, 0.5, 1.5);
      selSpt.castShadow = false;
      selTgt = new THREE.Object3D();
      scene.add(selSpt); scene.add(selTgt);
      selSpt.target = selTgt;
 
      buildGround();
      buildCentralPlaza();
      buildPaths();
      for (var i = 0; i < 4; i++) buildBuilding(i);
      for (var i = 0; i < 4; i++) buildWasteTank(i);
      buildTrees();
      buildLamps();
      buildPerimeterWall();
      buildParking();
    }
 
    // ============================================================
    //  GROUND — textured grass + perimeter paving
    // ============================================================
    function buildGround() {
      var grassTex = makeGrassTex();
      grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
      grassTex.repeat.set(18, 18);
      gndMat = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.92, metalness: 0 });
      var gnd = new THREE.Mesh(new THREE.PlaneGeometry(280, 280), gndMat);
      gnd.rotation.x = -Math.PI / 2;
      gnd.receiveShadow = true;
      scene.add(gnd);
 
      // Perimeter paved ring
      pathMat = new THREE.MeshStandardMaterial({ color: 0xc8b888, roughness: 0.45, metalness: 0.05, emissive: 0x000000, emissiveIntensity: 0 });
      pathMats.push(pathMat);
      var ring = new THREE.Mesh(new THREE.RingGeometry(108, 116, 64), pathMat);
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; ring.receiveShadow = true; scene.add(ring);
    }
 
    // ============================================================
    //  CENTRAL PLAZA — circular structure inspired by image
    // ============================================================
    function buildCentralPlaza() {
      var concreteMat = new THREE.MeshStandardMaterial({ color: 0xf0ebe0, roughness: 0.85, metalness: 0.02 });
      var accentMat = new THREE.MeshStandardMaterial({ color: 0x8aaa70, roughness: 0.7, metalness: 0.05 });
      var glassMat = new THREE.MeshStandardMaterial({ color: 0x8ab8d8, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.6 });
      var waterMat = new THREE.MeshStandardMaterial({ color: 0x3a8fcc, roughness: 0.02, metalness: 0.0, transparent: true, opacity: 0.85, emissive: 0x0a2a4a, emissiveIntensity: 0.25 });
      var roofWhite = new THREE.MeshStandardMaterial({ color: 0xf8f4ee, roughness: 0.75, metalness: 0.04 });
 
      // Ground paved disc
      var disc = new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 0.25, 40), concreteMat);
      disc.position.y = 0.13; disc.receiveShadow = true; disc.castShadow = false; scene.add(disc);
 
      // Inner green lawn ring
      var lawTex = makeGrassTex(); lawTex.wrapS = lawTex.wrapT = THREE.RepeatWrapping; lawTex.repeat.set(3, 3);
      var lawnMat = new THREE.MeshStandardMaterial({ map: lawTex, roughness: 0.9 });
      var lawn = new THREE.Mesh(new THREE.RingGeometry(8, 18, 40), lawnMat);
      lawn.rotation.x = -Math.PI / 2; lawn.position.y = 0.26; lawn.receiveShadow = true; scene.add(lawn);
 
      // Circular road / path on plaza
      var cRoad = new THREE.Mesh(new THREE.RingGeometry(18, 21, 40),
        new THREE.MeshStandardMaterial({ color: 0xc0aa80, roughness: 0.85 }));
      cRoad.rotation.x = -Math.PI / 2; cRoad.position.y = 0.27; cRoad.receiveShadow = true; scene.add(cRoad);
 
      // Central fountain base
      var fBase = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 6, 0.6, 20), concreteMat);
      fBase.position.y = 0.6; fBase.castShadow = true; fBase.receiveShadow = true; scene.add(fBase);
 
      // Fountain water pool
      var pool = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.2, 0.18, 20), waterMat);
      pool.position.y = 0.9; scene.add(pool);
 
      // Fountain tiered structure
      var t1 = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 4, 0.5, 16), concreteMat);
      t1.position.y = 1.4; t1.castShadow = true; scene.add(t1);
      var t2 = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.8, 0.5, 16), concreteMat);
      t2.position.y = 2.1; t2.castShadow = true; scene.add(t2);
      var t3m = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.6, 0.5, 16), concreteMat);
      t3m.position.y = 2.8; t3m.castShadow = true; scene.add(t3m);
      var spire = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.25, 2.2, 8),
        new THREE.MeshStandardMaterial({ color: 0xaac0d0, roughness: 0.4, metalness: 0.6 }));
      spire.position.y = 4.4; spire.castShadow = true; scene.add(spire);
 
      // Fountain light
      var fLt = new THREE.PointLight(0x88ccff, 1.8, 18);
      fLt.position.set(0, 1.8, 0); scene.add(fLt);
 
      // Circular canopy/pavilion posts and roof arcs (like the image)
      var postMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.65, metalness: 0.15 });
      var numPosts = 10;
      for (var p = 0; p < numPosts; p++) {
        var ang = (p / numPosts) * Math.PI * 2;
        var px = Math.cos(ang) * 13, pz = Math.sin(ang) * 13;
        var post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 5.5, 8), postMat);
        post.position.set(px, 3.0, pz); post.castShadow = true; scene.add(post);
        // Post base
        var pb = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.25, 8), concreteMat);
        pb.position.set(px, 0.38, pz); pb.castShadow = true; pb.receiveShadow = true; scene.add(pb);
      }
 
      // Canopy roof ring
      var canTube = new THREE.TorusGeometry(13, 0.55, 10, 40);
      var can = new THREE.Mesh(canTube, roofWhite);
      can.rotation.x = Math.PI / 2; can.position.y = 5.6; can.castShadow = true; scene.add(can);
 
      // Canopy shade panels
      for (var cp = 0; cp < numPosts; cp++) {
        var a0 = (cp / numPosts) * Math.PI * 2;
        var a1 = ((cp + 0.5) / numPosts) * Math.PI * 2;
        var panGeo = new THREE.Shape();
        panGeo.moveTo(Math.cos(a0) * 12, Math.sin(a0) * 12);
        panGeo.lineTo(Math.cos(a1) * 12, Math.sin(a1) * 12);
        panGeo.lineTo(Math.cos(a1) * 6, Math.sin(a1) * 6);
        panGeo.lineTo(Math.cos(a0) * 6, Math.sin(a0) * 6);
        panGeo.closePath();
        var panMesh = new THREE.Mesh(new THREE.ShapeGeometry(panGeo),
          new THREE.MeshStandardMaterial({ color: 0xf0ebe0, roughness: 0.8, side: THREE.DoubleSide }));
        panMesh.rotation.x = -Math.PI / 2; panMesh.position.y = 5.55;
        panMesh.castShadow = true; panMesh.receiveShadow = true; scene.add(panMesh);
      }
 
      // 4 benches around fountain
      var benchMat = new THREE.MeshStandardMaterial({ color: 0x8a7060, roughness: 0.75 });
      for (var b = 0; b < 4; b++) {
        var ba = b * Math.PI / 2 + Math.PI / 4;
        var bx = Math.cos(ba) * 7.5, bz = Math.sin(ba) * 7.5;
        var bseat = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.15, 0.65), benchMat);
        bseat.position.set(bx, 0.52, bz); bseat.rotation.y = ba; bseat.castShadow = true; bseat.receiveShadow = true; scene.add(bseat);
      }
 
      // Radial path strips from plaza to edges
      var pTex = makePathTex(); pTex.wrapS = pTex.wrapT = THREE.RepeatWrapping; pTex.repeat.set(1, 6);
      var rpMat = new THREE.MeshStandardMaterial({ map: pTex, roughness: 0.42, metalness: 0.04, emissive: 0x000000, emissiveIntensity: 0 });
      pathMats.push(rpMat);
      var pathAngles = [0, Math.PI / 2, Math.PI, Math.PI * 3 / 2, Math.PI / 4, Math.PI * 3 / 4, Math.PI * 5 / 4, Math.PI * 7 / 4];
      for (var pa = 0; pa < pathAngles.length; pa++) {
        var ang2 = pathAngles[pa];
        var pLen = 80, pW = 4.5;
        var pMesh = new THREE.Mesh(new THREE.PlaneGeometry(pW, pLen), rpMat);
        pMesh.rotation.x = -Math.PI / 2; pMesh.rotation.z = -ang2;
        pMesh.position.set(Math.cos(ang2) * (22 + pLen / 2), 0.03, Math.sin(ang2) * (22 + pLen / 2));
        pMesh.receiveShadow = true; scene.add(pMesh);
      }
    }
 
    // ============================================================
    //  PATHS between buildings
    // ============================================================
    function buildPaths() {
      var pTex = makePathTex(); pTex.wrapS = pTex.wrapT = THREE.RepeatWrapping; pTex.repeat.set(1, 4);
      var pm = new THREE.MeshStandardMaterial({ map: pTex, roughness: 0.42, metalness: 0.04, emissive: 0x000000, emissiveIntensity: 0 });
      pathMats.push(pm);
      function addPath(x, z, w, d, ry) {
        var m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), pm);
        m.rotation.x = -Math.PI / 2; if (ry) m.rotation.z = ry;
        m.position.set(x, 0.04, z); m.receiveShadow = true; scene.add(m);
      }
      addPath(-32, -15, 5, 20, 0); addPath(32, -15, 5, 20, 0);
      addPath(-32, 15, 5, 20, 0); addPath(32, 15, 5, 20, 0);
      addPath(0, -30, 64, 5, 0); addPath(0, 30, 64, 5, 0);
      addPath(-32, 0, 5, 60, 0); addPath(32, 0, 5, 60, 0);
      addPath(-16, -16, 4, 20, Math.PI / 4); addPath(16, -16, 4, 20, -Math.PI / 4);
      addPath(-16, 16, 4, 20, -Math.PI / 4); addPath(16, 16, 4, 20, Math.PI / 4);
    }
 
    // ============================================================
    //  BUILDINGS — modern cream/white Indian campus architecture
    // ============================================================
    function buildBuilding(i) {
      var g = new THREE.Group();
      g.position.set(bPos[i][0], 0, bPos[i][1]);
      var h = bH[i], w = bW[i], d = bD[i];
 
      var wallTex = makeWallTex();
      wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping; wallTex.repeat.set(2, 2);
      var roofTex = makeRoofTex();
      roofTex.wrapS = roofTex.wrapT = THREE.RepeatWrapping; roofTex.repeat.set(3, 2);
 
      var wallM = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.8, metalness: 0.02 });
      var roofM = new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.85, metalness: 0.02 });
      var glassM = new THREE.MeshStandardMaterial({
        color: 0x8ab8cc, roughness: 0.05, metalness: 0.15,
        transparent: true, opacity: 0.72, envMapIntensity: 0.6
      });
      var trimM = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHex(bAccHex[i]), roughness: 0.55, metalness: 0.15 });
      var concreteM = new THREE.MeshStandardMaterial({ color: 0xe8e2d8, roughness: 0.85, metalness: 0 });
 
      // ── Main body
      var body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallM);
      body.position.y = h / 2; body.castShadow = body.receiveShadow = true; g.add(body);
 
      // ── Floor division lines (horizontal bands)
      var floors = Math.ceil(h / 4.2);
      for (var f = 0; f < floors; f++) {
        var band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, 0.18, d + 0.12),
          new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.9 }));
        band.position.y = f * 4.2 + 4.0; g.add(band);
      }
 
      // ── Glass curtain wall sections (front face)
      var winRows = Math.floor((h - 2) / 4.2);
      var glassPerRow = Math.floor(w / 3.8);
      for (var fr = 0; fr < winRows; fr++) {
        var wy = 2.2 + fr * 4.2;
        for (var wc = 0; wc < glassPerRow; wc++) {
          var wx = -w / 2 + 1.9 + wc * 3.8;
          var gPanel = new THREE.Mesh(new THREE.BoxGeometry(3.0, 3.4, 0.08), glassM);
          gPanel.position.set(wx, wy, d / 2 + 0.06); gPanel.castShadow = false; g.add(gPanel);
          // trim around glass
          var hTrim = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.1, 0.04), trimM);
          hTrim.position.set(wx, wy - 1.7, d / 2 + 0.1); g.add(hTrim);
          var hTrimT = hTrim.clone(); hTrimT.position.y = wy + 1.7; g.add(hTrimT);
        }
        // Back face windows
        for (var wc = 0; wc < glassPerRow; wc++) {
          var wx2 = -w / 2 + 1.9 + wc * 3.8;
          var gp2 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.0, 0.08), glassM);
          gp2.position.set(wx2, wy, -(d / 2 + 0.06)); g.add(gp2);
        }
        // Side windows
        var sideW = Math.floor(d / 3.8);
        for (var sc = 0; sc < sideW; sc++) {
          var sz = -d / 2 + 1.9 + sc * 3.8;
          var sg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.8, 2.4), glassM);
          sg.position.set(w / 2 + 0.06, wy, sz); g.add(sg);
          var sg2 = sg.clone(); sg2.position.x = -(w / 2 + 0.06); g.add(sg2);
        }
      }
 
      // ── Accent entrance canopy
      var canW = bWingW[i] * 2, canD = 3.5;
      var canopy = new THREE.Mesh(new THREE.BoxGeometry(canW, 0.35, canD),
        new THREE.MeshStandardMaterial({ color: new THREE.Color().setHex(bAccHex[i]), roughness: 0.5, metalness: 0.2 }));
      canopy.position.set(0, 3.8, d / 2 + canD / 2); canopy.castShadow = true; g.add(canopy);
 
      // Canopy support pillars
      for (var cp = 0; cp < 2; cp++) {
        var cpx = (cp === 0 ? -1 : 1) * (canW / 2 - 0.4);
        var cpil = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 4, 8), concreteM);
        cpil.position.set(cpx, 2.0, d / 2 + canD - 0.4); cpil.castShadow = true; g.add(cpil);
      }
 
      // Entrance steps
      for (var st = 0; st < 3; st++) {
        var step = new THREE.Mesh(new THREE.BoxGeometry(canW + 0.6, 0.22, (st + 1) * 0.5), concreteM);
        step.position.set(0, 0.11 + st * 0.22, d / 2 + canD + 0.25 + (st) * 0.25); step.receiveShadow = true; g.add(step);
      }
 
      // ── Roof slab
      var roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.5, d + 0.6), roofM);
      roof.position.y = h + 0.25; roof.castShadow = true; g.add(roof);
 
      // Parapet
      var parM2 = new THREE.MeshStandardMaterial({ color: 0xe0d8c8, roughness: 0.85 });
      var parDef = [[w / 2 + 0.1, 0, 0.45, d + 0.9], [-w / 2 - 0.1, 0, 0.45, d + 0.9], [0, d / 2 + 0.1, w + 0.9, 0.45], [0, -d / 2 - 0.1, w + 0.9, 0.45]];
      for (var p = 0; p < 4; p++) {
        var par = new THREE.Mesh(new THREE.BoxGeometry(parDef[p][2], 1.4, parDef[p][3]), parM2);
        par.position.set(parDef[p][0], h + 1.0, parDef[p][1]); par.castShadow = true; g.add(par);
      }
 
      // ── Accent stripe on top of parapet
      var stripe = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.12, d + 0.6), trimM);
      stripe.position.y = h + 1.72; g.add(stripe);
 
      // ── Penthouse / stairwell
      var pent = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, 2.4, d * 0.3), concreteM);
      pent.position.set(-w * 0.15, h + 2.2, d * 0.12); pent.castShadow = true; g.add(pent);
 
      // ── Rooftop Water Tank (realistic metal + legs)
      var tY = h + 2.4, tH2 = 3.8, tR = 1.6, lH = 2.2;
      var stlM = new THREE.MeshStandardMaterial({ color: 0xc8d8e0, roughness: 0.2, metalness: 0.75, transparent: true, opacity: 0.38 });
      var frmM = new THREE.MeshStandardMaterial({ color: 0x607888, roughness: 0.5, metalness: 0.55 });
      var legPts = [[-1.2, -1.2], [-1.2, 1.2], [1.2, -1.2], [1.2, 1.2]];
      for (var li = 0; li < 4; li++) {
        var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, lH, 8), frmM);
        leg.position.set(legPts[li][0], tY - lH / 2, legPts[li][1]); g.add(leg);
      }
      var xbr1 = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.08, 0.08), frmM);
      xbr1.position.set(0, tY - lH * 0.6, 0); g.add(xbr1);
      var xbr2 = xbr1.clone(); xbr2.rotation.y = Math.PI / 2; g.add(xbr2);
 
      var tkOut = new THREE.Mesh(new THREE.CylinderGeometry(tR, tR, tH2, 20), stlM);
      tkOut.position.y = tY + tH2 / 2; tkOut.castShadow = true; g.add(tkOut);
      // Rings
      for (var r = 0; r < 5; r++) {
        var rng = new THREE.Mesh(new THREE.CylinderGeometry(tR + 0.06, tR + 0.06, 0.1, 20, 1, true),
          new THREE.MeshStandardMaterial({ color: 0x8098a8, roughness: 0.45, metalness: 0.7 }));
        rng.position.y = tY + r * (tH2 / 4.2); g.add(rng);
      }
      // Water fill
      var wl0 = Math.max(0.001, bWater[i] / 100);
      var wfM = new THREE.MeshStandardMaterial({
        color: 0x1a88ff, roughness: 0.02, transparent: true, opacity: 0.92,
        emissive: 0x0033aa, emissiveIntensity: 0.55
      });
      var wfMesh = new THREE.Mesh(new THREE.CylinderGeometry(tR - 0.12, tR - 0.12, tH2, 20), wfM);
      wfMesh.scale.y = wl0; wfMesh.position.y = tY + (tH2 * wl0) / 2; g.add(wfMesh);
      wMeshes.push({ mesh: wfMesh, baseY: tY, tH: tH2, mat: wfM });
      // Cap
      var capM = new THREE.Mesh(new THREE.CylinderGeometry(tR + 0.12, tR + 0.12, 0.25, 20),
        new THREE.MeshStandardMaterial({ color: 0x708898, roughness: 0.4, metalness: 0.6 }));
      capM.position.y = tY + tH2 + 0.13; g.add(capM);
 
      // ── Block label (sprite)
      var lc = document.createElement('canvas'); lc.width = 200; lc.height = 72;
      var lx = lc.getContext('2d');
      lx.fillStyle = 'rgba(250,248,242,.95)'; lx.fillRect(0, 0, 200, 72);
      lx.strokeStyle = bAccStr[i]; lx.lineWidth = 3; lx.strokeRect(3, 3, 194, 66);
      lx.fillStyle = bAccStr[i];
      lx.font = 'bold 22px Orbitron,sans-serif'; lx.textAlign = 'center'; lx.fillText('BLOCK ' + BLID[i], 100, 34);
      lx.font = '600 12px Rajdhani,sans-serif'; lx.fillStyle = '#4a5a4a'; lx.fillText(BLNM[i], 100, 54);
      var spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(lc), transparent: true }));
      spr.position.y = h + tH2 + 9; spr.scale.set(11, 4, 1); g.add(spr);
 
      // Accent light
      var tal = new THREE.PointLight(new THREE.Color().setHex(bAccHex[i]), 0, 35);
      tal.position.set(0, tY + tH2 / 2, 0); g.add(tal);
      tAccLts.push(tal);
 
      scene.add(g);
    }
 
    // ============================================================
    //  UNDERGROUND WASTE TANK — improved realistic materials
    // ============================================================
    function buildWasteTank(i) {
      var g = new THREE.Group();
      g.position.set(wPits[i][0], 0, wPits[i][1]);
 
      // Concrete rim (above ground)
      var rimM = new THREE.MeshStandardMaterial({ color: 0xc0b8a8, roughness: 0.9, metalness: 0.04 });
      var ro = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.3, 0.75, 16), rimM);
      ro.position.y = 0.38; ro.castShadow = true; ro.receiveShadow = true; g.add(ro);
 
      // Warning stripe
      for (var s = 0; s < 3; s++) {
        var hr = new THREE.Mesh(new THREE.CylinderGeometry(2.32, 2.32, 0.07, 16, 1, true),
          new THREE.MeshStandardMaterial({ color: s % 2 === 0 ? 0xffa000 : 0x333333, roughness: 0.7, emissive: s % 2 === 0 ? 0x220800 : 0, emissiveIntensity: 0.2 }));
        hr.position.y = 0.1 + s * 0.2; g.add(hr);
      }
 
      // Tank body (underground, semi-transparent)
      var tR = 1.45, tH = 5.5, tCY = -2.2;
      var tbM = new THREE.MeshStandardMaterial({
        color: 0x3a4838, roughness: 0.55, metalness: 0.3,
        transparent: true, opacity: 0.6, side: THREE.DoubleSide
      });
      var tb = new THREE.Mesh(new THREE.CylinderGeometry(tR, tR + 0.1, tH, 16), tbM);
      tb.position.y = tCY; tb.castShadow = true; g.add(tb);
 
      // Bands
      for (var r = 0; r < 5; r++) {
        var rb = new THREE.Mesh(new THREE.CylinderGeometry(tR + 0.08, tR + 0.08, 0.09, 16, 1, true),
          new THREE.MeshStandardMaterial({ color: 0x225522, roughness: 0.5, metalness: 0.3, emissive: 0x0a2210, emissiveIntensity: 0.25 }));
        rb.position.y = tCY - tH / 2 + 0.3 + r * ((tH - 0.3) / 4); g.add(rb);
      }
 
      // Fill mesh
      var fBaseY = tCY - tH / 2 + 0.12, fH = tH - 0.24;
      var flvl = Math.max(0.001, bWaste[i] / 100);
      var wfM2 = new THREE.MeshStandardMaterial({
        color: 0x22cc44, roughness: 0.15, transparent: true,
        opacity: 0.85, emissive: 0x0a2210, emissiveIntensity: 0.5
      });
      wFMats.push(wfM2);
      var wfMesh2 = new THREE.Mesh(new THREE.CylinderGeometry(tR - 0.12, tR - 0.02, fH, 14), wfM2);
      wfMesh2.scale.y = flvl; wfMesh2.position.y = fBaseY + (fH * flvl) / 2;
      g.add(wfMesh2);
      wFMeshes.push({ mesh: wfMesh2, baseY: fBaseY, fH: fH });
 
      // Cap
      var capM2 = new THREE.MeshStandardMaterial({ color: 0x4a5848, roughness: 0.6, metalness: 0.35 });
      var cap2 = new THREE.Mesh(new THREE.CylinderGeometry(tR + 0.12, tR + 0.12, 0.15, 14), capM2);
      cap2.position.y = tCY + tH / 2 + 0.08; g.add(cap2);
 
      // Manhole
      var mhM = new THREE.MeshStandardMaterial({ color: 0x606878, roughness: 0.55, metalness: 0.55 });
      var mh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.09, 12), mhM);
      mh.position.set(0.7, 0.76, 0.7); g.add(mh);
 
      // Vent pipes
      var ventPts = [[0.7, 0], [-0.7, 0], [0, 0.7], [0, -0.7]];
      for (var v = 0; v < 4; v++) {
        var vt = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.3, 6),
          new THREE.MeshStandardMaterial({ color: 0x4a5040, roughness: 0.5 }));
        vt.position.set(ventPts[v][0], 0.95, ventPts[v][1]); g.add(vt);
        var vc = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.07, 0.09, 6),
          new THREE.MeshStandardMaterial({ color: 0x606858, roughness: 0.5 }));
        vc.position.set(ventPts[v][0], 1.62, ventPts[v][1]); g.add(vc);
      }
 
      // Drain pipe to building
      var bz = bPos[i][1], pz = wPits[i][1], dir = pz > bz ? 1 : -1;
      var startZ = bz + dir * bD[i] / 2, endZ = pz + dir * (-2.5), pLen = Math.abs(endZ - startZ);
      if (pLen > 0.5) {
        var dp = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, pLen, 8),
          new THREE.MeshStandardMaterial({ color: 0x3a4848, roughness: 0.5, metalness: 0.55 }));
        dp.rotation.x = Math.PI / 2; dp.position.set(0, 0.28, (startZ + endZ) / 2 - wPits[i][1]); g.add(dp);
      }
 
      // Label
      var lc2 = document.createElement('canvas'); lc2.width = 160; lc2.height = 58;
      var lx2 = lc2.getContext('2d');
      lx2.fillStyle = 'rgba(240,238,232,.95)'; lx2.fillRect(0, 0, 160, 58);
      lx2.strokeStyle = '#3a8a30'; lx2.lineWidth = 1.5; lx2.strokeRect(2, 2, 156, 54);
      lx2.fillStyle = '#2a7020'; lx2.font = 'bold 13px Orbitron,sans-serif'; lx2.textAlign = 'center';
      lx2.fillText('WASTE BLK ' + BLID[i], 80, 23);
      lx2.font = '600 10px Rajdhani,sans-serif'; lx2.fillStyle = '#4a6a40';
      lx2.fillText(WTCAP[i].toLocaleString() + ' L', 80, 42);
      var wspr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(lc2), transparent: true }));
      wspr.position.y = tCY + tH / 2 + 2.8; wspr.scale.set(8, 3, 1); g.add(wspr);
 
      var wgl = new THREE.PointLight(0x40cc60, 0, 22);
      wgl.position.y = tCY; g.add(wgl);
      wFLights.push(wgl);
      scene.add(g);
    }
 
    // ============================================================
    //  REALISTIC TREES — sphere-cluster approach
    // ============================================================
    function buildTrees() {
      // Deciduous (round canopy) — main campus trees
      function addDeciduous(x, z, scale) {
        var g = new THREE.Group(); scale = scale || 1;
        // Trunk (tapered)
        var trkM = new THREE.MeshStandardMaterial({ color: 0x7a5030, roughness: 0.9, metalness: 0 });
        var trk = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * scale, 0.28 * scale, 3.5 * scale, 8), trkM);
        trk.position.y = 1.75 * scale; trk.castShadow = true; g.add(trk);
        // Main canopy — cluster of spheres
        var greens = [0x2a7a18, 0x358822, 0x409028, 0x28701a, 0x3a8820];
        var clusters = [
          [0, 4.5 * scale, 0, 2.2 * scale],
          [1.2 * scale, 4.0 * scale, 0.8 * scale, 1.7 * scale],
          [-1.0 * scale, 4.0 * scale, -0.8 * scale, 1.6 * scale],
          [0.5 * scale, 5.0 * scale, -1.0 * scale, 1.5 * scale],
          [-0.8 * scale, 4.8 * scale, 0.9 * scale, 1.4 * scale],
          [0, 3.3 * scale, 0, 1.8 * scale]
        ];
        for (var c = 0; c < clusters.length; c++) {
          var cl = clusters[c];
          var sph = new THREE.Mesh(new THREE.SphereGeometry(cl[3], 8, 6),
            new THREE.MeshStandardMaterial({
              color: greens[c % greens.length], roughness: 0.88, metalness: 0,
              emissive: 0x0a2008, emissiveIntensity: 0.08
            }));
          sph.position.set(cl[0], cl[1], cl[2]); sph.castShadow = true; sph.receiveShadow = false; g.add(sph);
        }
        g.position.set(x, 0, z);
        g.rotation.y = Math.random() * Math.PI;
        scene.add(g);
      }
 
      // Palm tree
      function addPalm(x, z, scale) {
        var g = new THREE.Group(); scale = scale || 1;
        var trkM = new THREE.MeshStandardMaterial({ color: 0x9a7050, roughness: 0.92 });
        // Segmented trunk (slightly curved)
        var segs = 6;
        for (var s = 0; s < segs; s++) {
          var seg = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.18 * scale, 1.5 * scale, 7), trkM);
          seg.position.set(Math.sin(s * 0.15) * 0.3 * scale, (s * 1.5 + 0.75) * scale, Math.cos(s * 0.1) * 0.2 * scale);
          seg.rotation.z = Math.sin(s * 0.15) * 0.08; seg.castShadow = true; g.add(seg);
        }
        // Palm fronds (curved planes)
        var frondM = new THREE.MeshStandardMaterial({ color: 0x3a7820, roughness: 0.85, side: THREE.DoubleSide });
        var tH2 = segs * 1.5 * scale;
        var numFronds = 10;
        for (var f = 0; f < numFronds; f++) {
          var fa = f / numFronds * Math.PI * 2;
          var frond = new THREE.Mesh(new THREE.PlaneGeometry(0.5 * scale, 3.5 * scale), frondM);
          frond.position.set(Math.cos(fa) * 0.3 * scale, tH2, Math.sin(fa) * 0.3 * scale);
          frond.rotation.y = fa; frond.rotation.x = -Math.PI / 4;
          frond.castShadow = true; g.add(frond);
        }
        // Coconuts
        for (var cn = 0; cn < 4; cn++) {
          var cna = cn / 4 * Math.PI * 2;
          var nut = new THREE.Mesh(new THREE.SphereGeometry(0.2 * scale, 6, 6),
            new THREE.MeshStandardMaterial({ color: 0x8a6028, roughness: 0.85 }));
          nut.position.set(Math.cos(cna) * 0.6 * scale, tH2 - 0.4 * scale, Math.sin(cna) * 0.6 * scale);
          g.add(nut);
        }
        g.position.set(x, 0, z);
        g.rotation.y = Math.random() * Math.PI;
        scene.add(g);
      }
 
      // Hedge / shrub
      function addShrub(x, z, scale) {
        var g = new THREE.Group(); scale = scale || 1;
        var shrubM = new THREE.MeshStandardMaterial({ color: 0x2a7020, roughness: 0.9, metalness: 0 });
        for (var s = 0; s < 3; s++) {
          var sh = new THREE.Mesh(new THREE.SphereGeometry((0.7 + Math.random() * 0.3) * scale, 7, 5), shrubM);
          sh.position.set((Math.random() - 0.5) * 0.8 * scale, 0.55 * scale, (Math.random() - 0.5) * 0.8 * scale);
          sh.scale.y = 0.7; sh.castShadow = true; sh.receiveShadow = true; g.add(sh);
        }
        g.position.set(x, 0, z); scene.add(g);
      }
 
      // Main campus trees — along pathways
      var decTrees = [
        [-14, -14], [14, -14], [-14, 14], [14, 14],
        [0, -48], [0, 48], [-48, 0], [48, 0],
        [-40, -40], [40, -40], [-40, 40], [40, 40],
        [-22, -5], [22, -5], [-22, 5], [22, 5],
        [-8, -22], [8, -22], [-8, 22], [8, 22],
        [-50, -20], [50, -20], [-50, 20], [50, 20],
        [-20, -50], [20, -50], [-20, 50], [20, 50],
        [-60, 0], [60, 0], [0, -60], [0, 60],
        [-40, 0], [40, 0], [0, -40], [0, 40],
        [-55, -35], [55, -35], [-55, 35], [55, 35],
        [-35, -55], [35, -55], [-35, 55], [35, 55]
      ];
      for (var t = 0; t < decTrees.length; t++) {
        addDeciduous(decTrees[t][0], decTrees[t][1], 0.78 + Math.random() * 0.44);
      }
 
      // Palm trees — near central plaza and entrance
      var palmPts = [
        [-10, 0], [10, 0], [0, -10], [0, 10],
        [-7, -7], [7, -7], [-7, 7], [7, 7],
        [-26, -26], [26, -26], [-26, 26], [26, 26]
      ];
      for (var p = 0; p < palmPts.length; p++) {
        addPalm(palmPts[p][0], palmPts[p][1], 0.85 + Math.random() * 0.25);
      }
 
      // Shrubs near buildings and paths
      var shrubPts = [
        [-24, -22], [-24, -26], [-28, -22], [-28, -26],
        [24, -22], [24, -26], [28, -22], [28, -26],
        [-24, 22], [-24, 26], [-28, 22], [-28, 26],
        [24, 22], [24, 26], [28, 22], [28, 26],
        [-5, -30], [5, -30], [-5, 30], [5, 30],
        [-30, -5], [-30, 5], [30, -5], [30, 5],
        [-18, 0], [18, 0], [0, -18], [0, 18]
      ];
      for (var s = 0; s < shrubPts.length; s++) {
        addShrub(shrubPts[s][0], shrubPts[s][1], 0.55 + Math.random() * 0.3);
      }
    }
 
    // ============================================================
    //  LAMP POSTS — modern campus style
    // ============================================================
    function buildLamps() {
      var postM = new THREE.MeshStandardMaterial({ color: 0x485058, roughness: 0.45, metalness: 0.75 });
      var armM = new THREE.MeshStandardMaterial({ color: 0x384048, roughness: 0.45, metalness: 0.75 });
      var shadeM = new THREE.MeshStandardMaterial({ color: 0x282e30, roughness: 0.5, metalness: 0.7, side: THREE.BackSide });
      var baseM = new THREE.MeshStandardMaterial({ color: 0x3a4248, roughness: 0.7, metalness: 0.6 });
 
      var lampPts = [
        // North-South central spine
        [0, -38], [0, -52], [0, -68], [0, -85], [0, -100],
        [0, 38], [0, 52], [0, 68], [0, 85], [0, 100],
        // East-West central spine
        [-38, 0], [-52, 0], [-68, 0], [-85, 0], [-100, 0],
        [38, 0], [52, 0], [68, 0], [85, 0], [100, 0],
        // NW diagonal
        [-14, -14], [-22, -22], [-30, -30], [-38, -38], [-48, -48],
        // NE diagonal
        [14, -14], [22, -22], [30, -30], [38, -38], [48, -48],
        // SW diagonal
        [-14, 14], [-22, 22], [-30, 30], [-38, 38], [-48, 48],
        // SE diagonal
        [14, 14], [22, 22], [30, 30], [38, 38], [48, 48],
        // Building access paths
        [-32, -10], [-32, -18], [-32, -26], [-32, -34], [-32, -42], [-32, -50],
        [32, -10], [32, -18], [32, -26], [32, -34], [32, -42], [32, -50],
        [-32, 10], [-32, 18], [-32, 26], [-32, 34], [-32, 42], [-32, 50],
        [32, 10], [32, 18], [32, 26], [32, 34], [32, 42], [32, 50],
        // Cross connectors
        [-18, -30], [-10, -30], [10, -30], [18, -30],
        [-18, 30], [-10, 30], [10, 30], [18, 30],
        [-18, -18], [-18, -8], [-18, 8], [-18, 18],
        [18, -18], [18, -8], [18, 8], [18, 18],
        // Plaza ring
        [14, 0], [-14, 0], [0, 14], [0, -14],
        [10, 10], [10, -10], [-10, 10], [-10, -10],
        // Perimeter
        [-95, -20], [-95, 20], [95, -20], [95, 20],
        [-20, -95], [20, -95], [-20, 95], [20, 95],
        [-72, -72], [72, -72], [-72, 72], [72, 72]
      ];
 
      // Build every lamp post with emissive bulb (no per-post PointLight — avoids WebGL limit)
      for (var li = 0; li < lampPts.length; li++) {
        var g = new THREE.Group();
        var px = lampPts[li][0];
        var pz = lampPts[li][1];
 
        // Base plate
        var bp = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.18, 8), baseM);
        bp.position.y = 0.09; bp.receiveShadow = true; g.add(bp);
 
        // Pole
        var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 6.5, 8), postM);
        pole.position.y = 3.34; pole.castShadow = true; g.add(pole);
 
        // Arm — face outward from campus centre
        var ang = Math.atan2(pz, px);
        var arm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 1.6, 7), armM);
        arm.rotation.z = Math.PI / 2.2; arm.rotation.y = -ang;
        arm.position.set(Math.cos(ang) * 0.72, 6.55, Math.sin(ang) * 0.72);
        g.add(arm);
 
        // Lantern housing
        var lhx = Math.cos(ang) * 1.45, lhz = Math.sin(ang) * 1.45;
        var lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.32, 8), armM);
        lantern.position.set(lhx, 6.38, lhz); g.add(lantern);
 
        // Bulb — individual emissive material so each can be toggled
        var bulbM = new THREE.MeshStandardMaterial({
          color: 0xfffde0, emissive: 0xffee44,
          emissiveIntensity: 5.0,  // always glowing
          roughness: 0.05
        });
        walkBulbs.push(bulbM);
        var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), bulbM);
        bulb.position.set(lhx, 6.36, lhz); g.add(bulb);
 
        // Glow halo ring (larger translucent sphere behind bulb for bloom feel)
        var haloM = new THREE.MeshStandardMaterial({
          color: 0xffee88, emissive: 0xffdd22,
          emissiveIntensity: 3.0, transparent: true, opacity: 0.18,
          roughness: 0.0, depthWrite: false
        });
        walkBulbs.push(haloM);  // track for toggling
        var halo = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), haloM);
        halo.position.set(lhx, 6.36, lhz); g.add(halo);
 
        // Shade cowl
        var shade = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.42, 10, 1, true), shadeM);
        shade.position.set(lhx, 6.60, lhz); g.add(shade);
 
        // Decorative ring at pole top
        var ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.035, 6, 10), armM);
        ring.rotation.x = Math.PI / 2; ring.position.y = 6.65; g.add(ring);
 
        g.position.set(px, 0, pz);
        scene.add(g);
      }
 
      // ── WALKWAY SPOT LIGHTS — aimed straight down at path surfaces
      // SpotLights create visible bright pools on the ground regardless of material.
      // Positioned at lamp-arm height (y=6.5) directly above each walkway segment.
      var spotPts = [
        // Central N-S spine
        [0, -38], [0, -52], [0, -68], [0, -85],
        [0, 38], [0, 52], [0, 68], [0, 85],
        // Central E-W spine
        [-38, 0], [-52, 0], [-68, 0], [-85, 0],
        [38, 0], [52, 0], [68, 0], [85, 0],
        // Diagonal paths
        [-20, -20], [-35, -35], [-50, -50],
        [20, -20], [35, -35], [50, -50],
        [-20, 20], [-35, 35], [-50, 50],
        [20, 20], [35, 35], [50, 50],
        // Building access paths
        [-32, -22], [-32, -36], [-32, -50],
        [32, -22], [32, -36], [32, -50],
        [-32, 22], [-32, 36], [-32, 50],
        [32, 22], [32, 36], [32, 50],
        // Cross connectors
        [-14, -30], [0, -30], [14, -30],
        [-14, 30], [0, 30], [14, 30],
        [-18, -8], [-18, 8], [18, -8], [18, 8]
      ];
      for (var sp = 0; sp < spotPts.length; sp++) {
        var slt = new THREE.SpotLight(0xffee88, 0, 30, Math.PI / 5, 0.35, 1.6);
        slt.position.set(spotPts[sp][0], 6.5, spotPts[sp][1]);
        // Aim straight down at ground
        var tObj = new THREE.Object3D();
        tObj.position.set(spotPts[sp][0], 0, spotPts[sp][1]);
        scene.add(tObj);
        slt.target = tObj;
        slt.castShadow = false;
        scene.add(slt);
        walkLights.push(slt);
      }
    }
 
    // ============================================================
    //  PERIMETER WALL — low campus boundary wall
    // ============================================================
    function buildPerimeterWall() {
      var wallM = new THREE.MeshStandardMaterial({ color: 0xe0d8c8, roughness: 0.88, metalness: 0 });
      var capM = new THREE.MeshStandardMaterial({ color: 0xc8b890, roughness: 0.82 });
      var R = 108;
      var segs = 36;
      for (var s = 0; s < segs; s++) {
        var a0 = s / segs * Math.PI * 2, a1 = (s + 1) / segs * Math.PI * 2;
        var x0 = Math.cos(a0) * R, z0 = Math.sin(a0) * R;
        var x1 = Math.cos(a1) * R, z1 = Math.sin(a1) * R;
        var mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
        var len = Math.sqrt((x1 - x0) * (x1 - x0) + (z1 - z0) * (z1 - z0));
        var ang = Math.atan2(z1 - z0, x1 - x0);
        var wall = new THREE.Mesh(new THREE.BoxGeometry(len + 0.1, 1.8, 0.5), wallM);
        wall.position.set(mx, 0.9, mz); wall.rotation.y = -ang;
        wall.castShadow = true; wall.receiveShadow = true; scene.add(wall);
        // Wall cap
        var wcap = new THREE.Mesh(new THREE.BoxGeometry(len + 0.2, 0.18, 0.65), capM);
        wcap.position.set(mx, 1.89, mz); wcap.rotation.y = -ang; scene.add(wcap);
      }
 
      // Gate pillars (South entrance)
      var pilM = new THREE.MeshStandardMaterial({ color: 0xf0e8d8, roughness: 0.8, metalness: 0.05 });
      [[-5.5, R], [5.5, R]].forEach(function (pp) {
        var pil = new THREE.Mesh(new THREE.BoxGeometry(1.8, 5, 1.8), pilM);
        pil.position.set(pp[0], 2.5, pp[1]); pil.castShadow = true; scene.add(pil);
        var pc = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.9, 0.9, 6),
          new THREE.MeshStandardMaterial({ color: 0xd8c898, roughness: 0.7 }));
        pc.position.set(pp[0], 5.45, pp[1]); scene.add(pc);
      });
      // Gate arch
      var archM = new THREE.MeshStandardMaterial({ color: 0xf5f0e5, roughness: 0.78, metalness: 0.05 });
      var arch = new THREE.Mesh(new THREE.TorusGeometry(4.5, 0.45, 8, 16, Math.PI), archM);
      arch.rotation.z = Math.PI; arch.position.set(0, 5.5, R); arch.castShadow = true; scene.add(arch);
      var archCap = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.6, 1.2),
        new THREE.MeshStandardMaterial({ color: 0xd8c888, roughness: 0.75 }));
      archCap.position.set(0, 5.3, R); scene.add(archCap);
 
      // Campus name sign on arch
      var signC = document.createElement('canvas'); signC.width = 340; signC.height = 72;
      var sc2 = signC.getContext('2d');
      sc2.fillStyle = 'rgba(42,100,20,.95)'; sc2.fillRect(0, 0, 340, 72);
      sc2.strokeStyle = '#8ac050'; sc2.lineWidth = 2.5; sc2.strokeRect(3, 3, 334, 66);
      sc2.fillStyle = '#f0f8e8'; sc2.font = 'bold 22px Orbitron,sans-serif'; sc2.textAlign = 'center';
      sc2.fillText('CAMPUS IoT MONITOR', 170, 30);
      sc2.font = '600 13px Rajdhani,sans-serif'; sc2.fillStyle = '#aad870';
      sc2.fillText('Smart Infrastructure Management System', 170, 54);
      var signSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(signC), transparent: true }));
      signSpr.position.set(0, 7.5, R); signSpr.scale.set(14, 3.5, 1); scene.add(signSpr);
 
      // Entrance road
      var rdM = new THREE.MeshStandardMaterial({ color: 0xb8a878, roughness: 0.88 });
      var rd = new THREE.Mesh(new THREE.PlaneGeometry(11, 24), rdM);
      rd.rotation.x = -Math.PI / 2; rd.position.set(0, 0.05, R - 12); rd.receiveShadow = true; scene.add(rd);
    }
 
    // ============================================================
    //  PARKING AREA
    // ============================================================
    function buildParking() {
      var paveM = new THREE.MeshStandardMaterial({ color: 0xa8a098, roughness: 0.9, metalness: 0 });
      var lineM = new THREE.MeshStandardMaterial({ color: 0xf8f4e8, roughness: 0.8 });
      // Two parking areas beside entrance
      [[-22, 85], [22, 85]].forEach(function (pos) {
        var lot = new THREE.Mesh(new THREE.PlaneGeometry(18, 22), paveM);
        lot.rotation.x = -Math.PI / 2; lot.position.set(pos[0], 0.06, pos[1]); lot.receiveShadow = true; scene.add(lot);
        // Parking lines
        for (var pl = 0; pl < 5; pl++) {
          var line = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 0.12), lineM);
          line.rotation.x = -Math.PI / 2; line.position.set(pos[0] - 6 + pl * 3, 0.07, pos[1]); scene.add(line);
        }
        // Some cars
        var carColors = [0xcc2020, 0x2040cc, 0xe8e0d0, 0x208020, 0x202020];
        for (var ci = 0; ci < 4; ci++) {
          var car = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.85, 3.8),
            new THREE.MeshStandardMaterial({ color: carColors[ci], roughness: 0.35, metalness: 0.45 }));
          car.position.set(pos[0] - 4.5 + ci * 3, 0.47, pos[1] - 2); car.castShadow = true; car.receiveShadow = true; scene.add(car);
          var win = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 2.0),
            new THREE.MeshStandardMaterial({ color: 0x8ab8cc, roughness: 0.05, metalness: 0.15, transparent: true, opacity: 0.7 }));
          win.position.set(pos[0] - 4.5 + ci * 3, 1.0, pos[1] - 2); scene.add(win);
        }
      });
    }
 
    // ============================================================
    //  ORBIT CAMERA
    // ============================================================
    var sT = 0.68, sP = 0.92, sR = 110;
 
    function applyCam() {
      camera.position.set(
        sR * Math.sin(sP) * Math.sin(sT),
        8 + sR * Math.cos(sP),
        sR * Math.sin(sP) * Math.cos(sT)
      );
      camera.lookAt(0, 2, 0);
    }
 
    var camAid = null;
    function animCam(tT, tP) {
      if (camAid) clearInterval(camAid);
      var s0 = sT, sp0 = sP;
      var dT = tT - s0, dP = (tP || sP) - sp0;
      while (dT > Math.PI) dT -= Math.PI * 2; while (dT < -Math.PI) dT += Math.PI * 2;
      var pg = 0;
      camAid = setInterval(function () {
        pg = Math.min(1, pg + 0.04); var t = 1 - Math.pow(1 - pg, 3);
        sT = s0 + dT * t; sP = sp0 + dP * t; applyCam();
        if (pg >= 1) clearInterval(camAid);
      }, 16);
    }
    function resetCam() { sR = 110; animCam(0.68, 0.92); }
 
    function startOrbit() {
      var sw2 = ge('sw'), cv2 = ge('cv');
      var drag = false, pmx = 0, pmy = 0;
      cv2.addEventListener('mousedown', function (e) { if (e.button === 0) { drag = true; pmx = e.clientX; pmy = e.clientY; cv2.style.cursor = 'grabbing'; } });
      window.addEventListener('mouseup', function () { drag = false; cv2.style.cursor = 'grab'; });
      window.addEventListener('mousemove', function (e) {
        if (!drag) return;
        sT -= (e.clientX - pmx) * 0.005;
        sP = Math.max(0.04, Math.min(1.65, sP + (e.clientY - pmy) * 0.005));
        pmx = e.clientX; pmy = e.clientY; applyCam();
      });
      cv2.addEventListener('wheel', function (e) {
        e.preventDefault(); sR = Math.max(18, Math.min(220, sR + e.deltaY * 0.08)); applyCam();
      }, { passive: false });
      cv2.style.cursor = 'grab';
      var tc = null;
      cv2.addEventListener('touchstart', function (e) { if (e.touches.length === 1) tc = { x: e.touches[0].clientX, y: e.touches[0].clientY }; });
      cv2.addEventListener('touchmove', function (e) {
        if (!tc || e.touches.length !== 1) return; e.preventDefault();
        sT -= (e.touches[0].clientX - tc.x) * 0.005;
        sP = Math.max(0.04, Math.min(1.65, sP + (e.touches[0].clientY - tc.y) * 0.005));
        tc = { x: e.touches[0].clientX, y: e.touches[0].clientY }; applyCam();
      }, { passive: false });
      window.addEventListener('resize', function () {
        var W = sw2.clientWidth, H = sw2.clientHeight; if (!W || !H) return;
        renderer.setSize(W, H); camera.aspect = W / H; camera.updateProjectionMatrix();
      });
    }
