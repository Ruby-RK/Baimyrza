function checkLogin() {
    let l = document.getElementById('login-input').value;
    let p = document.getElementById('pass-input').value;
    if (l === '1' && p === '1') {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-menu').style.display = 'block';
    } else {
        document.getElementById('login-error').innerText = 'Неверный логин или пароль! (Вводите 1 и 1)';
    }
}

const translations = {
    ru: {
        badge: "МОБИЛЬНАЯ AI ПЛАТФОРМА", title: "Дизайн и ремонт в вашем смартфоне",
        desc: "<strong>NUR</strong> оптимизирован под любые телефоны и планшеты. Управляйте проектом, меняйте квадратуру и генерируйте смету в реальном времени прямо на ходу!",
        startBtn: "🚀 Запустить 3D Конфигуратор", f1: "Плавная работа 3D-сцены без лагов на любых гаджетах.", f2: "Генерация планировок с помощью текстового ввода.", f3: "Мгновенный расчет в тенге под вашим пальцем."
    },
    kz: {
        badge: "МОБИЛЬДІ AI ПЛАТФОРМА", title: "Смартфоныңыздағы дизайн мен жөндеу",
        desc: "<strong>NUR</strong> кез келген телефондар мен планшеттерге бейімделген. Жобаны басқарыңыз, аумақты өзгертіңіз және сметаны лезде есептеңіз!",
        startBtn: "🚀 3D Конфигураторды іске қосу", f1: "Кез келген құрылғыда қатесіз жұмыс істейтін 3D көрініс.", f2: "Мәтіндік енгізу арқылы жоспарларды генерациялау.", f3: "Теңгемен лезде есептеу."
    },
    en: {
        badge: "MOBILE AI PLATFORM", title: "Design & Remodel in Your Smartphone",
        desc: "<strong>NUR</strong> is optimized for any phones and tablets. Manage your project, change square meters and generate estimates instantly on the go!",
        startBtn: "🚀 Launch 3D Configurator", f1: "Smooth 3D rendering without lags on any device.", f2: "Layout generation via text input.", f3: "Instant estimation in KZT right under your finger."
    }
};

function setLanguage(lang) {
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('lang-' + lang).classList.add('active');
    let t = translations[lang];
    document.getElementById('t-badge').innerText = t.badge;
    document.getElementById('t-title').innerText = t.title;
    document.getElementById('t-desc').innerHTML = t.desc;
    document.getElementById('t-btn-start').innerText = t.startBtn;
    document.getElementById('t-f1').innerText = t.f1;
    document.getElementById('t-f2').innerText = t.f2;
    document.getElementById('t-f3').innerText = t.f3;
}

function openConfigurator() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('configurator-screen').style.display = 'block';
    if (!is3DInit) { init3D(); is3DInit = true; }
}

function backToMenu() {
    document.getElementById('configurator-screen').style.display = 'none';
    document.getElementById('main-menu').style.display = 'block';
}

// Управление шторкой меню на телефоне
function toggleMobilePanel() {
    let panel = document.getElementById('ui-panel');
    panel.classList.toggle('open');
}

// AI-АРХИТЕКТОР
function processAiPrompt() {
    let text = document.getElementById('ai-prompt').value.toLowerCase();
    if (!text) return;
    let inst = document.getElementById('instruction');
    inst.innerText = "🤖 AI генерирует проект...";

    let areaMatch = text.match(/(\d+)\s*(м2|м²|кв|квадрат|sqm)/);
    if (areaMatch && areaMatch[1]) {
        let area = parseInt(areaMatch[1]);
        if (area >= 15 && area <= 200) updateAreaFromInput(area);
    }

    if (text.includes('лофт') || text.includes('темн') || text.includes('dark')) changeWallColor('#3a3b3c');
    else if (text.includes('сканди') || text.includes('светл') || text.includes('light')) changeWallColor('#f5f5f0');
    else if (text.includes('зелен')) changeWallColor('#8a9a86');
    else if (text.includes('беж')) changeWallColor('#e6d7c3');

    if (text.includes('паркет')) setFloor('parquet');
    else if (text.includes('плитк') || text.includes('кафель')) setFloor('tile');
    else if (text.includes('ламинат')) setFloor('laminate');

    if (text.includes('ванн')) addArchElement('bath');
    if (text.includes('унитаз')) addArchElement('toilet');
    if (text.includes('раковин')) addArchElement('sink');
    if (text.includes('двер')) addArchElement('door');

    updatePrice();
    setTimeout(() => { inst.innerText = "✨ Проект обновлен с помощью AI!"; }, 600);
}

// --- 3D ДВИЖОК ---
let is3DInit = false;
let scene, camera, renderer, currentBuildingGroup;
let floorMeshList = [], wallMeshList = [], wallMaterial, currentFloorMesh;
let ambientLight, dirLight, ledSpotLight;
let interactMode = 'socket';

let elements = [], doorsList = [], plumbingList = [];
let raycaster = new THREE.Raycaster(), mouse = new THREE.Vector2();

let selectedObject = null, isDraggingObject = false;
let isPointerDown = false, previousMousePosition = { x: 0, y: 0 };
let cameraRadius = 12, cameraTheta = 0.8, cameraPhi = 1.0;

let roomWidth = 6.0;
let roomLength = 7.5;
let currentPartitionMode = 'studio';

const pricesPerSqMeter = { laminate: 8500, tile: 14000, parquet: 22000 };
const baseRepairCostPerSqM = 12000;
let currentFloorType = 'laminate';

function init3D() {
    const container = document.getElementById('canvas-container');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e0e11);

    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
    updateCameraPosition();

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Оптимизация под экраны телефонов ретина
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    dirLight = new THREE.DirectionalLight(0xfff5ea, 0.9);
    dirLight.position.set(8, 12, 8);
    dirLight.castShadow = true;
    scene.add(dirLight);

    ledSpotLight = new THREE.PointLight(0xffb703, 0, 10);
    ledSpotLight.position.set(0, 3, 0);
    scene.add(ledSpotLight);

    wallMaterial = new THREE.MeshStandardMaterial({ color: 0xf0ede6, roughness: 0.8 });
    buildHybridRoom();

    const dom = renderer.domElement;
    
    // Универсальные события мыши и тач-скрина без задержек
    dom.addEventListener('pointerdown', onPointerDown, { passive: true });
    dom.addEventListener('pointermove', onPointerMove, { passive: true });
    dom.addEventListener('pointerup', onPointerUp, { passive: true });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
}

function updateDimensions() {
    roomWidth = parseFloat(document.getElementById('slider-w').value);
    roomLength = parseFloat(document.getElementById('slider-l').value);
    document.getElementById('val-w').innerText = roomWidth;
    document.getElementById('val-l').innerText = roomLength;

    let area = Math.round(roomWidth * roomLength);
    document.getElementById('area-input').value = area;
    document.getElementById('area-display').innerText = area;
    buildHybridRoom();
}

function updateAreaFromInput(val) {
    let area = parseFloat(val);
    if (!area || area < 10) area = 10;
    roomWidth = Math.round(Math.sqrt(area * 0.8) * 2) / 2;
    roomLength = Math.round((area / roomWidth) * 2) / 2;

    document.getElementById('slider-w').value = roomWidth;
    document.getElementById('slider-l').value = roomLength;
    document.getElementById('val-w').innerText = roomWidth;
    document.getElementById('val-l').innerText = roomLength;
    document.getElementById('area-display').innerText = area;
    buildHybridRoom();
}

function buildHybridRoom() {
    if (currentBuildingGroup) scene.remove(currentBuildingGroup);
    currentBuildingGroup = new THREE.Group();
    floorMeshList = []; wallMeshList = [];
    
    [...elements, ...doorsList, ...plumbingList].forEach(obj => scene.remove(obj));
    elements = []; doorsList = []; plumbingList = [];

    const floorMat = new THREE.MeshStandardMaterial({ color: 0xb58a59, roughness: 0.4 });
    let fGeo = new THREE.PlaneGeometry(roomWidth, roomLength);
    currentFloorMesh = new THREE.Mesh(fGeo, floorMat);
    currentFloorMesh.rotation.x = -Math.PI / 2;
    currentFloorMesh.receiveShadow = true;
    currentBuildingGroup.add(currentFloorMesh);
    floorMeshList.push(currentFloorMesh);

    let hW = roomWidth / 2;
    let hL = roomLength / 2;

    addWall(0, 1.75, -hL, roomWidth, 3.5, 0);
    addWall(-hW, 1.75, 0, roomLength, 3.5, Math.PI / 2);
    addWall(hW, 1.75, 0, roomLength, 3.5, -Math.PI / 2);

    if (currentPartitionMode === '1wall') {
        addWall(0, 1.75, 0, roomLength * 0.6, 3.5, Math.PI / 2);
    } else if (currentPartitionMode === 'bath_zone') {
        addWall(hW - 1.5, 1.75, -hL + 1.25, 2.5, 3.5, 0);
        addWall(hW - 2.75, 1.75, -hL + 0.6, 1.2, 3.5, Math.PI / 2);
    }

    scene.add(currentBuildingGroup);
    setFloor(currentFloorType);
    updatePrice();
}

function togglePartition(mode) {
    currentPartitionMode = mode;
    document.querySelectorAll('#btn-p-studio, #btn-p-1wall, #btn-p-bath').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-p-' + (mode === 'studio' ? 'studio' : (mode === '1wall' ? '1wall' : 'bath'))).classList.add('active');
    buildHybridRoom();
}

function addWall(x, y, z, width, height, rotationY) {
    let wall = new THREE.Mesh(new THREE.PlaneGeometry(width, height), wallMaterial);
    wall.position.set(x, y, z); wall.rotation.y = rotationY; wall.receiveShadow = true;
    currentBuildingGroup.add(wall); wallMeshList.push(wall);
}

function updateCameraPosition() {
    camera.position.x = cameraRadius * Math.sin(cameraPhi) * Math.sin(cameraTheta);
    camera.position.y = cameraRadius * Math.cos(cameraPhi);
    camera.position.z = cameraRadius * Math.sin(cameraPhi) * Math.cos(cameraTheta);
    camera.lookAt(0, 1, 0);
}

function setLighting(mode) {
    document.getElementById('btn-day').classList.remove('active');
    document.getElementById('btn-night').classList.remove('active');
    document.getElementById('btn-' + mode).classList.add('active');
    if (mode === 'day') {
        scene.background.setHex(0x0e0e11); ambientLight.intensity = 0.7; dirLight.intensity = 0.9; ledSpotLight.intensity = 0;
    } else {
        scene.background.setHex(0x050508); ambientLight.intensity = 0.15; dirLight.intensity = 0.2; ledSpotLight.intensity = 2.5;
    }
}

function addArchElement(type) {
    if (type === 'door') {
        let doorGroup = new THREE.Group(); doorGroup.userData = { isOpen: false, isDoor: true };
        let frame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.2, 0.1), new THREE.MeshStandardMaterial({ color: 0x222222 }));
        let panel = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.1, 0.05), new THREE.MeshStandardMaterial({ color: 0x5c3d2e }));
        panel.position.set(0.45, 0, 0);
        let pivot = new THREE.Group(); pivot.position.set(-0.45, 0, 0); pivot.add(panel);
        doorGroup.add(frame, pivot); doorGroup.position.set(0, 1.1, -roomLength/2 + 0.05);
        scene.add(doorGroup); doorsList.push(doorGroup);
    } else if (type === 'toilet') {
        let mesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 0.6), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        mesh.position.set(1.5, 0.22, -1.5); scene.add(mesh); plumbingList.push(mesh);
    } else if (type === 'sink') {
        let mesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.5), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        mesh.position.set(1.5, 0.8, -0.5); scene.add(mesh); plumbingList.push(mesh);
    } else if (type === 'bath') {
        let mesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 1.6), new THREE.MeshStandardMaterial({ color: 0xf8f9fa }));
        mesh.position.set(1.8, 0.3, 1.0); scene.add(mesh); plumbingList.push(mesh);
    }
    updatePrice();
}

function onPointerDown(e) {
    // Если клик/тап идет по левой панели управления на десктопе — игнорируем 3D
    if (e.clientX < 320 && window.innerWidth > 768) return;
    
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    if (interactMode === 'move') {
        let allMovables = [...plumbingList, ...doorsList];
        let intersects = raycaster.intersectObjects(allMovables, true);
        if (intersects.length > 0) {
            let obj = intersects[0].object;
            while (obj.parent && obj.parent !== scene) obj = obj.parent;
            selectedObject = obj; isDraggingObject = true; return;
        }
    }

    let allDoorParts = [];
    doorsList.forEach(d => d.traverse(c => { if(c.isMesh) allDoorParts.push(c); }));
    let doorIntersects = raycaster.intersectObjects(allDoorParts);
    if (doorIntersects.length > 0 && interactMode !== 'delete') {
        let parentDoor = doorIntersects[0].object.parent;
        while (parentDoor && !parentDoor.userData.isDoor) parentDoor = parentDoor.parent;
        if (parentDoor) {
            let pivot = parentDoor.children[1];
            pivot.rotation.y = parentDoor.userData.isOpen ? 0 : Math.PI / 2;
            parentDoor.userData.isOpen = !parentDoor.userData.isOpen;
            return;
        }
    }

    if (interactMode === 'delete') {
        let allDeletables = [...elements, ...plumbingList, ...doorsList];
        let delIntersects = raycaster.intersectObjects(allDeletables, true);
        if (delIntersects.length > 0) {
            let target = delIntersects[0].object;
            while (target.parent && target.parent !== scene) target = target.parent;
            scene.remove(target);
            elements = elements.filter(el => el !== target);
            plumbingList = plumbingList.filter(el => el !== target);
            doorsList = doorsList.filter(el => el !== target);
            updatePrice(); return;
        }
    }

    if (interactMode === 'socket' || interactMode === 'switch') {
        let wallIntersects = raycaster.intersectObjects(wallMeshList);
        if (wallIntersects.length > 0) {
            let hit = wallIntersects[0];
            const geom = interactMode === 'socket' ? new THREE.BoxGeometry(0.14, 0.14, 0.03) : new THREE.CylinderGeometry(0.07, 0.07, 0.02, 16);
            const mesh = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({ color: interactMode === 'socket' ? 0xffffff : 0x111111 }));
            mesh.position.copy(hit.point).addScaledVector(hit.face.normal, 0.015);
            mesh.userData = { type: interactMode };
            scene.add(mesh); elements.push(mesh); updatePrice(); return;
        }
    }

    isPointerDown = true; 
    previousMousePosition = { x: e.clientX, y: e.clientY };
}

function onPointerMove(e) {
    if (isDraggingObject && selectedObject && currentFloorMesh) {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        let floorIntersect = raycaster.intersectObject(currentFloorMesh);
        if (floorIntersect.length > 0) {
            let p = floorIntersect[0].point;
            selectedObject.position.x = p.x;
            selectedObject.position.z = p.z;
        }
        return;
    }

    if (!isPointerDown) return;
    let deltaX = e.clientX - previousMousePosition.x;
    let deltaY = e.clientY - previousMousePosition.y;

    cameraTheta -= deltaX * 0.008;
    cameraPhi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, cameraPhi - deltaY * 0.008));
    updateCameraPosition();
    previousMousePosition = { x: e.clientX, y: e.clientY };
}

function onPointerUp() { 
    isPointerDown = false; 
    isDraggingObject = false; 
    selectedObject = null; 
}

function changeWallColor(hex) { wallMaterial.color.set(hex); }
function setFloor(type) {
    currentFloorType = type;
    document.querySelectorAll('#btn-fl-laminate, #btn-fl-tile, #btn-fl-parquet').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-fl-' + type).classList.add('active');

    let hex = type === 'tile' ? 0xdbe2ef : (type === 'parquet' ? 0x5c3d2e : 0xb58a59);
    floorMeshList.forEach(f => f.material.color.setHex(hex));
    updatePrice();
}

function setInteractionMode(mode) {
    interactMode = mode;
    document.getElementById('btn-move').classList.remove('active');
    document.getElementById('btn-socket').classList.remove('active');
    document.getElementById('btn-switch').classList.remove('active');
    document.getElementById('btn-del').classList.remove('active');
    document.getElementById('btn-' + mode).classList.add('active');

    let inst = document.getElementById('instruction');
    if (mode === 'move') inst.innerText = "🖐️ Передвижение: зажми и тяни предмет пальцем по полу!";
    else if (mode === 'socket') inst.innerText = "🔌 Тапни по стене, чтобы поставить розетку";
    else if (mode === 'switch') inst.innerText = "💡 Тапни по стене, чтобы поставить выключатель";
    else if (mode === 'delete') inst.innerText = "🗑️ Тапни по элементу, чтобы удалить его";
}

function updatePrice() {
    let area = Math.round(roomWidth * roomLength);
    let sockets = elements.filter(el => el.userData.type === 'socket').length;
    let switches = elements.filter(el => el.userData.type === 'switch').length;

    let baseRepairTotal = area * baseRepairCostPerSqM;
    let floorTotal = area * pricesPerSqMeter[currentFloorType];
    let doorsTotal = doorsList.length * 95000;
    let plumbingTotal = plumbingList.length * 120000;
    let electricsTotal = (sockets * 5000) + (switches * 4000);

    let total = baseRepairTotal + floorTotal + doorsTotal + plumbingTotal + electricsTotal;
    document.getElementById('total-price').innerText = total.toLocaleString('ru-RU');
}

function generateReport() {
    let area = Math.round(roomWidth * roomLength);
    let sockets = elements.filter(el => el.userData.type === 'socket').length;
    let switches = elements.filter(el => el.userData.type === 'switch').length;
    let total = document.getElementById('total-price').innerText;

    let reportText = `=================================================\n` +
                     `         NUR BUILD — MOBILE BIM-СМЕТА          \n` +
                     `=================================================\n` +
                     `Площадь: ${area} м² (${roomWidth}м x ${roomLength}м)\n` +
                     `ИТОГО СМЕТА: ${total} ₸\n` +
                     `=================================================\n`;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([reportText], { type: 'text/plain;charset=utf-8' }));
    link.download = `BIM_Smeta_${area}sqm_NUR.txt`; link.click();
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}