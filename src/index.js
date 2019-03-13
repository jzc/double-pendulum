import * as THREE from "three";

let container;
let camera, scene, renderer;
let uniforms;
let pivot1, rod1, pivot2, rod2, pivot3;
const rh = .25;
const pz = 0;
const rz = -.5;
const axis = new THREE.Vector3(0, 0, 1);

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
setAngle(2.7*Math.PI, 0.5*Math.PI);

function init() {
    container = document.getElementById('container');
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    onWindowResize();
    window.addEventListener('resize', onWindowResize, false);

    uniforms = { "uTime": { value: 0.0 } };
    let noiseMesh = new THREE.Mesh(
        new THREE.PlaneBufferGeometry(2, 2),
        new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: vs,
            fragmentShader: fs
        }),
    );
    scene.add(noiseMesh);

    pivot1 = createMeshObj(new THREE.CircleBufferGeometry(0.025, 64), new THREE.MeshBasicMaterial);
    pivot1.mat.color.set("#3177ea");
    
    rod1 = createMeshObj(new THREE.PlaneBufferGeometry(0.025, rh), new THREE.MeshBasicMaterial);
    rod1.mat.color.set("#4286f4");
    
    pivot2 = createMeshObj(new THREE.CircleBufferGeometry(0.025, 64), new THREE.MeshBasicMaterial);
    pivot2.mat.color.set("#3177ea");
    
    rod2 = createMeshObj(new THREE.PlaneBufferGeometry(0.025, rh), new THREE.MeshBasicMaterial);
    rod2.mat.color.set("#4286f4");
    
    pivot3 = createMeshObj(new THREE.CircleBufferGeometry(0.025, 64), new THREE.MeshBasicMaterial);
    pivot3.mat.color.set("#3177ea"); 
}

function createMeshObj(geometry, mat) {
    let mesh = new THREE.Mesh(geometry, mat);
    scene.add(mesh);
    return {mesh: mesh, mat: mat, geometry: geometry};
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
    // console.log(timestamp);
}

function setAngle(th1, th2) {
    pivot1.mesh.position.set(0, 0, pz);

    rod1.mesh.position.set(0, -rh/2, rz);
    rod1.mesh.position.applyAxisAngle(axis, th1);
    rod1.mesh.quaternion.setFromAxisAngle(axis, th1);
    
    pivot2.mesh.position.set(0, -rh, pz);
    pivot2.mesh.position.applyAxisAngle(axis, th1);

    rod2.mesh.position.set(0, -3*rh/2, rz);
    rod2.mesh.position.applyAxisAngle(axis, th1);
    rod2.mesh.position.sub(pivot2.mesh.position);
    rod2.mesh.position.applyAxisAngle(axis, th2);
    rod2.mesh.position.add(pivot2.mesh.position);

    rod2.mesh.quaternion.setFromAxisAngle(axis, th1+th2);

    pivot3.mesh.position.set(0, -2*rh, rz);
    pivot3.mesh.position.applyAxisAngle(axis, th1);
    pivot3.mesh.position.sub(pivot2.mesh.position);
    pivot3.mesh.position.applyAxisAngle(axis, th2);
    pivot3.mesh.position.add(pivot2.mesh.position);
}