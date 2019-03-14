import * as THREE from "three";

let container;
let camera, scene, renderer;
let uniforms;
// let pivot1, rod1, pivot2, rod2, pivot3;
const rh = .3;
const pz = 0;
const rz = -.5;
const axis = new THREE.Vector3(0, 0, 1);
const g = 9.8;

const vs = `
    varying vec2 vUv;
    uniform float uAspect;

    void main()	{
        vUv = vec2(uv.x, uv.y / uAspect);
        gl_Position = vec4(position, 1.0);
    }
`;

const fs = `
    varying vec2 vUv;
    uniform float uTime;

    float random (vec2 st) {
        return fract(
            sin(
                dot(st.xy, vec2(12.9898,78.233))//+uTime*.2
            )*43758.5453123
        );
    }

    float noise (vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
    
        // Four corners in 2D of a tile
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
    
        // Smooth Interpolation
    
        // Cubic Hermine Curve.  Same as SmoothStep()
        vec2 u = f*f*(3.0-2.000*f);
    
        // Mix 4 coorners percentages
        return mix(a, b, u.x) +
                (c - a)* u.y * (1.0 - u.x) +
                (d - b) * u.x * u.y;
    }

    void main()	{
        // vec2 uv = vUv;
        // gl_FragColor = vec4(vec3(noise(10.0*uv)), 1);
        gl_FragColor = vec4(1, 1, 1, 1);
    }
`;

class Pendulum {
    constructor(rodColor, pivotColor, m, l, th0, th1) {
        this.pivot1 = createMeshObj(new THREE.CircleBufferGeometry(0.025, 64), new THREE.MeshBasicMaterial);
        this.pivot1.mat.color.set(pivotColor);
        
        this.rod1 = createMeshObj(new THREE.PlaneBufferGeometry(0.025, rh), new THREE.MeshBasicMaterial);
        this.rod1.mat.color.set(rodColor);
        
        this.pivot2 = createMeshObj(new THREE.CircleBufferGeometry(0.025, 64), new THREE.MeshBasicMaterial);
        this.pivot2.mat.color.set(pivotColor);
        
        this.rod2 = createMeshObj(new THREE.PlaneBufferGeometry(0.025, rh), new THREE.MeshBasicMaterial);
        this.rod2.mat.color.set(rodColor);
        
        this.pivot3 = createMeshObj(new THREE.CircleBufferGeometry(0.025, 64), new THREE.MeshBasicMaterial);
        this.pivot3.mat.color.set(pivotColor); 

        this.reset(th0, th1);
        this.f = makeDoublePendulumEqn(m, l);
    }

    reset(th0, th1) {
        this.th0 = th0;
        this.th1 = th1;
        this.pth0 = 0;
        this.pth1 = 0;
    }

    // Unlike th0 and th1 from the pendulum equation, th1 is the angle of the 
    // lower rod as measured from th0.
    setAngle(th0, th1) {
        this.pivot1.mesh.position.set(0, 0, pz);

        this.rod1.mesh.position.set(0, -rh/2, rz);
        this.rod1.mesh.position.applyAxisAngle(axis, th0);
        this.rod1.mesh.quaternion.setFromAxisAngle(axis, th0);
        
        this.pivot2.mesh.position.set(0, -rh, pz);
        this.pivot2.mesh.position.applyAxisAngle(axis, th0);

        this.rod2.mesh.position.set(0, -3*rh/2, rz);
        this.rod2.mesh.position.applyAxisAngle(axis, th0);
        this.rod2.mesh.position.sub(this.pivot2.mesh.position);
        this.rod2.mesh.position.applyAxisAngle(axis, th1);
        this.rod2.mesh.position.add(this.pivot2.mesh.position);

        this.rod2.mesh.quaternion.setFromAxisAngle(axis, th0+th1);

        this.pivot3.mesh.position.set(0, -2*rh, rz);
        this.pivot3.mesh.position.applyAxisAngle(axis, th0);
        this.pivot3.mesh.position.sub(this.pivot2.mesh.position);
        this.pivot3.mesh.position.applyAxisAngle(axis, th1);
        this.pivot3.mesh.position.add(this.pivot2.mesh.position);
    }

    step(h) {
        [this.th0, this.th1, this.pth0, this.pth1] = rk4Step(this.f, [this.th0, this.th1, this.pth0, this.pth1], h);
        this.setAngle(this.th0, this.th1-this.th0);
    }
}

let h = .005;
let pendulums = [];

init();
animate();

function animate(timestamp) {
    requestAnimationFrame(animate);
    uniforms["uTime"].value = timestamp / 1000;
    
    renderer.render(scene, camera);
    
    for (let p of pendulums) {
        p.step(h);
    }
}

function init() {
    container = document.getElementById('container');
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    uniforms = { "uTime": { value: 0.0 }, "uAspect": { value: 1.0 } };
    onWindowResize();
    window.addEventListener('resize', onWindowResize, false);

    let noiseMesh = new THREE.Mesh(
        new THREE.PlaneBufferGeometry(2, 2),
        // new THREE.MeshBasicMaterial,
        new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: vs,
            fragmentShader: fs
        }),
    );
    scene.add(noiseMesh);

    for (let i = 0; i < 20; i++) {
        let th = 0.9*Math.PI + .00001*i;
        pendulums.push(new Pendulum("#3177ea", "#4286f4", .1, .1, th, th));
    }

    // pendulums.push(new Pendulum("#3177ea", "#4286f4", .1, .1, 0.500*Math.PI, 0.501*Math.PI));
    // pendulums.push(new Pendulum("#3177ea", "#4286f4", .1, .1, 0.501*Math.PI, 0.502*Math.PI));
    // pendulums.push(new Pendulum("#3177ea", "#4286f4", .1, .1, 0.502*Math.PI, 0.503*Math.PI));
    // pendulums.push(new Pendulum("#3177ea", "#4286f4", .1, .1, 0.503*Math.PI, 0.504*Math.PI));
}

function createMeshObj(geometry, mat) {
    let mesh = new THREE.Mesh(geometry, mat);
    scene.add(mesh);
    return {mesh: mesh, mat: mat, geometry: geometry};
}

function onWindowResize() {
    let ratio = window.innerWidth/window.innerHeight
    camera.left = -ratio;
    camera.right = ratio;
    uniforms["uAspect"].value = ratio; 
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function vectorScale(v, c) {
    return v.map(x => x*c);
}

function vectorAdd(...vs) {
    return vs.reduce(function (acc, v) {
        return acc.map((x, i) => x+v[i])
    }, Array(vs[0].length).fill(0));
}

function rk4Step(f, yn, h) {
    let k1 = vectorScale(f(yn), h);
    let k2 = vectorScale(f(vectorAdd(yn, vectorScale(k1, 1/2))), h);
    let k3 = vectorScale(f(vectorAdd(yn, vectorScale(k2, 1/2))), h);
    let k4 = vectorScale(f(vectorAdd(yn, k3)), h);
    return vectorAdd(yn, vectorScale(vectorAdd(
        k1,
        vectorScale(k2, 2),
        vectorScale(k3, 2),
        k4,
    ), 1/6));
}

// source: https://en.wikipedia.org/wiki/Double_pendulum
// Note: th1 and th2 are angle of the the respective rod as measured from the vertical.
function makeDoublePendulumEqn(m, l) {
    return function(x) {
        let [th1, th2, pth1, pth2] = x;
        let th1d = (6/(m*l**2)) * ((2*pth1-3*Math.cos(th1-th2)*pth2)/(16-9*(Math.cos(th1-th2)**2)));
        let th2d = (6/(m*l**2)) * ((8*pth2-3*Math.cos(th1-th2)*pth1)/(16-9*(Math.cos(th1-th2)**2)));
        let pth1d = ((-1/2)*m*(l**2)) * (th1d*th2d*Math.sin(th1-th2)+3*g/l*Math.sin(th1));
        let pth2d = ((-1/2)*m*(l**2)) * (-th1d*th2d*Math.sin(th1-th2)+g/l*Math.sin(th2));
        return [th1d, th2d, pth1d, pth2d];
    }
}