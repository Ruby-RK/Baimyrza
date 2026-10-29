// Проверка Входа (Логин: 1 / Пароль: 1)
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

// Перевод языков
const translations = {
    ru: {
        badge: "Инновации в строительстве КЗ", title: "Строительство и ремонт нового поколения",
        desc: "<strong>Baimyrza</strong> — это передовая платформа цифрового моделирования. Зачем нужен этот сайт? Он полностью убирает споры на стройке, подсчитывает материалы и кабели в реальном тенге, а клиент сам кастомизирует проект в 3D режиме!",
        startBtn: "🚀 Открыть 3D Конфигуратор комнат", f1: "Полная кастомизация стен, пола, дверей и электрики в реальном времени.", f2: "Автоматический расчет материалов, кабелей и сантехники для прораба.", f3: "Прозрачные расчеты и точное соответствие ожиданиям клиента."
    },
    kz: {
        badge: "ҚР құрылыс саласындағы инновациялар", title: "Жаңа буын құрылысы мен жөндеу",
        desc: "<strong>Baimyrza</strong> — бұл цифрлық модельдеудің озық платформасы. Бұл сайт не үшін қажет? Ол нысандағы дауларды болдырмайды, шығындарды нақты теңгемен есептейді және клиентке 3D режимінде жобаны өзі баптауға мүмкіндік береді!",
        startBtn: "🚀 3D Бөлме Конфигураторын ашу", f1: "Қабырғаларды, еденді, есіктерді және электр желілерін толық баптау.", f2: "Прораб үшін материалдар мен кабельдерді автоматты түрде есептеу.", f3: "Мөлдір есеп айырысулар және клиенттің үмітін нақты орындау."
    },
    en: {
        badge: "Construction Innovations in KZ", title: "Next-Gen Construction & Remodeling",
        desc: "<strong>Baimyrza</strong> is an advanced digital modeling platform. Why is this site needed? It eliminates site disputes, automates estimates in real currency, and allows clients to customize projects in 3D!",
        startBtn: "🚀 Open 3D Room Configurator", f1: "Full real-time customization of walls, flooring, doors, and wiring.", f2: "Automatic calculation of materials, cables, and plumbing for foremen.", f3: "Transparent estimates matching exact client expectations."
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

// --- 3D ДВИЖОК ---
let is3DInit = false;
let scene, camera, renderer, currentBuildingGroup;
let floorMeshList = [], wallMeshList = [], wallMaterial, currentFloorMesh;
let ambientLight, dirLight, ledSpotLight;
let interactMode = 'socket'; // 'socket', 'switch', 'delete', 'move'
let elements = [], doorsList = [], plumbingList = [];
let raycaster = new THREE.Raycaster(), mouse = new THREE.Vector2();

// Движение предметов (исправлено!)
let selectedObject = null;
let isDraggingObject = false;

// Вращение 360 градусов мышка / тач
let isMouseDown = false, previousMousePosition = { x: 0, y: 0 };
let cameraRadius = 11, cameraTheta = 0.8, cameraPhi = 1.0;

const buildingsData = {
    '1room': { name: '1-Комн Квартира + Санузел', baseRepair: 480000 },
    '2room': { name: '2-Комн Квартира Евро', baseRepair: 850000 },
    'house': { name: 'Загородный Коттедж', baseRepair: 1600000 }
};
let currentBuildingType = '1room';
const prices = { floor: { laminate: 60000, tile: 95000, parquet: 140000 }, socket: 5000, switch: 4000 };
let currentFloorType = 'laminate';

function init3D() {
    const container = document.getElementById('canvas-container');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e0e11);

    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
    updateCameraPosition();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
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

    buildBuilding('1room');

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onPointerDown);
    dom.addEventListener('mousemove', onPointerMove);
    dom.addEventListener('mouseup', onPointerUp);

    // Поддержка сенсорных экранов (смартфоны)
    dom.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            onPointerDown({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
        }
    });
    dom.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
            onPointerMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
        }
    });
    dom.addEventListener('touchend', onPointerUp);

    animate();
}

function updateCameraPosition() {
    camera.position.x = cameraRadius * Math.sin(cameraPhi) * Math.sin(cameraTheta);
    camera.position.y = cameraRadius * Math.cos(cameraPhi);
    camera.position.z = cameraRadius * Math.sin(cameraPhi) * Math.cos(cameraTheta);
    camera.lookAt(0, 1, 0);
}

function buildBuilding(type) {
    if (currentBuildingGroup) scene.remove(currentBuildingGroup);
    currentBuildingGroup = new THREE.Group();
    floorMeshList = []; wallMeshList = [];
    [...elements, ...doorsList, ...plumbingList].forEach(obj => scene.remove(obj));
    elements = []; doorsList = []; plumbingList = [];

    const floorMat = new THREE.MeshStandardMaterial({ color: 0xb58a59, roughness: 0.4 });

    if (type === '1room') {
        let f = new THREE.Mesh(new THREE.PlaneGeometry(7, 6), floorMat);
        f.rotation.x = -Math.PI / 2; f.receiveShadow = true;
        currentBuildingGroup.add(f); floorMeshList.push(f); currentFloorMesh = f;
        addWall(0, 1.75, -3, 7, 3.5, 0);
        addWall(-3.5, 1.75, 0, 6, 3.5, Math.PI / 2);
        addWall(3.5, 1.75, 0, 6, 3.5, -Math.PI / 2);
        addWall(1.5, 1.75, 0, 3, 3.5, Math.PI / 2);
    } else if (type === '2room') {
        let f = new THREE.Mesh(new THREE.PlaneGeometry(10, 7), floorMat);
        f.rotation.x = -Math.PI / 2; f.receiveShadow = true;
        currentBuildingGroup.add(f); floorMeshList.push(f); currentFloorMesh = f;
        addWall(0, 1.75, -3.5, 10, 3.5, 0);
        addWall(-5, 1.75, 0, 7, 3.5, Math.PI / 2);
        addWall(5, 1.75, 0, 7, 3.5, -Math.PI / 2);
        addWall(0, 1.75, 0, 7, 3.5, Math.PI / 2);
    } else if (type === 'house') {
        let f = new THREE.Mesh(new THREE.PlaneGeometry(11, 9), floorMat);
        f.rotation.x = -Math.PI / 2; f.receiveShadow = true;
        currentBuildingGroup.add(f); floorMeshList.push(f); currentFloorMesh = f;
        addWall(0, 1.75, -4.5, 11, 3.5, 0);
        addWall(-5.5, 1.75, 0, 9, 3.5, Math.PI / 2);
        addWall(5.5, 1.75, 0, 9, 3.5, -Math.PI / 2);
        addWall(0, 1.75, 4.5, 11, 3.5, Math.PI);
    }
    scene.add(currentBuildingGroup);
    setFloor(currentFloorType);
}

function addWall(x, y, z, width, height, rotationY) {
    let wall = new THREE.Mesh(new THREE.PlaneGeometry(width, height), wallMaterial);
    wall.position.set(x, y, z); wall.rotation.y = rotationY; wall.receiveShadow = true;
    currentBuildingGroup.add(wall); wallMeshList.push(wall);
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
        doorGroup.add(frame, pivot); doorGroup.position.set(1.5, 1.1, -2.95);
        scene.add(doorGroup); doorsList.push(doorGroup);
    } else if (type === 'toilet') {
        let mesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 0.6), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        mesh.position.set(2.5, 0.22, -2.5); scene.add(mesh); plumbingList.push(mesh);
    } else if (type === 'sink') {
        let mesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.5), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        mesh.position.set(2.5, 0.8, -1.0); scene.add(mesh); plumbingList.push(mesh);
    } else if (type === 'bath') {
        let mesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 1.6), new THREE.MeshStandardMaterial({ color: 0xf8f9fa }));
        mesh.position.set(2.8, 0.3, 1.5); scene.add(mesh); plumbingList.push(mesh);
    }
    updatePrice();
}

function onPointerDown(e) {
    if (e.clientX < 340 && window.innerWidth > 768) return;
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    // 1. Режим передвижения предметов (исправленный луч по полу)
    if (interactMode === 'move') {
        let allMovables = [...plumbingList, ...doorsList];
        let intersects = raycaster.intersectObjects(allMovables, true);
        if (intersects.length > 0) {
            let obj = intersects[0].object;
            while (obj.parent && obj.parent !== scene) obj = obj.parent;
            selectedObject = obj;
            isDraggingObject = true;
            return;
        }
    }

    // 2. Открывание двери
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

    // 3. Режим удаления
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
            updatePrice();
            return;
        }
    }

    // 4. Установка розеток
    if (interactMode === 'socket' || interactMode === 'switch') {
        let wallIntersects = raycaster.intersectObjects(wallMeshList);
        if (wallIntersects.length > 0) {
            let hit = wallIntersects[0];
            const geom = interactMode === 'socket' ? new THREE.BoxGeometry(0.14, 0.14, 0.03) : new THREE.CylinderGeometry(0.07, 0.07, 0.02, 16);
            const mesh = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({ color: interactMode === 'socket' ? 0xffffff : 0x111111 }));
            mesh.position.copy(hit.point).addScaledVector(hit.face.normal, 0.015);
            mesh.userData = { type: interactMode };
            scene.add(mesh); elements.push(mesh); updatePrice();
            return;
        }
    }

    // Вращение сцены
    isMouseDown = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
}

function onPointerMove(e) {
    // Точное перемещение предмета по полу
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

    if (!isMouseDown) return;
    let deltaX = e.clientX - previousMousePosition.x;
    let deltaY = e.clientY - previousMousePosition.y;

    cameraTheta -= deltaX * 0.008;
    cameraPhi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, cameraPhi - deltaY * 0.008));

    updateCameraPosition();
    previousMousePosition = { x: e.clientX, y: e.clientY };
}

function onPointerUp() {
    isMouseDown = false;
    isDraggingObject = false;
    selectedObject = null;
}

function switchBuilding(type) {
    currentBuildingType = type;
    document.querySelectorAll('.cfg-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('btn-b-' + type).classList.add('active');
    buildBuilding(type); updatePrice();
}

function changeWallColor(hex) { wallMaterial.color.set(hex); }
function setFloor(type) {
    currentFloorType = type;
    let hex = type === 'tile' ? 0xdbe2ef : (type === 'parquet' ? 0x5c3d2e : 0xb58a59);
    floorMeshList.forEach(f => f.material.color.setHex(hex)); updatePrice();
}

function setInteractionMode(mode) {
    interactMode = mode;
    document.getElementById('btn-move').classList.remove('active');
    document.getElementById('btn-socket').classList.remove('active');
    document.getElementById('btn-switch').classList.remove('active');
    document.getElementById('btn-del').classList.remove('active');
    
    document.getElementById('btn-' + mode).classList.add('active');

    let inst = document.getElementById('instruction');
    if (mode === 'move') inst.innerText = "🖐️ Передвижение: зажми и тяни сантехнику или дверь по полу!";
    else if (mode === 'socket') inst.innerText = "🔌 Кликни по стене, чтобы поставить розетку";
    else if (mode === 'switch') inst.innerText = "💡 Кликни по стене, чтобы поставить выключатель";
    else if (mode === 'delete') inst.innerText = "🗑️ Кликни по элементу, чтобы удалить его";
}

function updatePrice() {
    let sockets = elements.filter(el => el.userData.type === 'socket').length;
    let switches = elements.filter(el => el.userData.type === 'switch').length;
    let total = buildingsData[currentBuildingType].baseRepair + prices.floor[currentFloorType] + (doorsList.length * 95000) + (plumbingList.length * 120000) + (sockets * 5000) + (switches * 4000);
    document.getElementById('total-price').innerText = total.toLocaleString('ru-RU');
}

function generateReport() {
    let sockets = elements.filter(el => el.userData.type === 'socket').length;
    let switches = elements.filter(el => el.userData.type === 'switch').length;
    let total = document.getElementById('total-price').innerText;
    let reportText = `=================================================\n` +
                     `       BAIMYRZA BUILD — ИНЖЕНЕРНЫЙ BIM-АКТ       \n` +
                     `=================================================\n` +
                     `Объект: ${buildingsData[currentBuildingType].name}\n` +
                     `Точек розеток: ${sockets} шт. | Выключателей: ${switches} шт.\n` +
                     `Расчетный расход кабеля ВВГнг: ~${(sockets*8 + switches*12 + 25)} м.\n` +
                     `-------------------------------------------------\n` +
                     `ИТОГО СМЕТА: ${total} ₸\n` +
                     `=================================================\n`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([reportText], { type: 'text/plain;charset=utf-8' }));
    link.download = 'BIM_Smeta_Baimyrza.txt'; link.click();
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}