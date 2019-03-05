import * as THREE from "three";

let container;
let camera, scene, renderer;
let uniforms;

const vs = `
    varying vec2 vUv;
    void main()	{
        vUv = uv;
        gl_Position = vec4( position, 1.0 );
    }
`;

const fs = `
    varying vec2 vUv;
    uniform float uTime;

    float random (vec2 st) {
        return fract(
            sin(
                dot(st.xy, vec2(12.9898,78.233))
            )*43758.5453123
        );
    }

    void main()	{
        float rand = random(vUv);
        gl_FragColor = vec4(vec3(rand), 1);
    }
`;

init();
animate();

function init() {
    container = document.getElementById('container');
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    let geometry = new THREE.PlaneBufferGeometry(2, 2);
    uniforms = {
        "uTime": { value: 1.0 }
    };
    let material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vs,
        fragmentShader: fs
    });
    let mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let pivotMaterial = new THREE.MeshBasicMaterial({ color: "0x2194ce"})
    let pivot1 = new THREE.CircleBufferGeometry(0.01, 32);
    let pivotMesh = new THREE.Mesh(pivot1, pivotMaterial);
    // pivotMesh.matrix.makeTranslation(-1, -1, 0);
    // pivotMesh.matrixAutoUpdate = false;
    scene.add(pivotMesh);

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);


    onWindowResize();
    window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
    camera.left = -window.innerWidth/window.innerHeight;
    camera.right = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(timestamp) {
    requestAnimationFrame(animate);
    uniforms["uTime"].value = timestamp / 1000;
    renderer.render(scene, camera);
}