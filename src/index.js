import * as THREE from "three";
import { MeshLine, MeshLineMaterial } from "three.meshline";

let container;
let camera, scene, renderer;
let uniforms;
// let pivot1, rod1, pivot2, rod2, pivot3;
const rh = .5;
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
                dot(st.xy, vec2(12.9898,78.233))+uTime*.2
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
        // gl_FragColor = vec4(vec3(noise(64.0*uv)), 1.0);
        gl_FragColor = vec4(0, 0, 0, 1);
    }
`;

const trajectory_length = 150;

class Pendulum {
    constructor(rodColor, pivotColor, trajectoryColor, m, l, th1, th2) {
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

        this.reset(th1, th2);
        this.f = makeDoublePendulumEqn(m, l);
        this.trajectory_geometry = new THREE.Geometry();
        for (let i = 0; i < trajectory_length; i++) {
            this.trajectory_geometry.vertices.push(new THREE.Vector3(0, 0, 0));
        }
        this.trajectory_line = new MeshLine();
        this.trajectory_line.setGeometry(this.trajectory_geometry, p => p);
        this.trajectory_material = new MeshLineMaterial({
            color: trajectoryColor, 
            lineWidth: .005,
            transparent: true,
            opacity: .5,
        })
        // this.trajectory_material.transparent = true;
        // this.trajectory_material.opacity = .5;

        this.trajectory_mesh = new THREE.Mesh(this.trajectory_line.geometry, this.trajectory_material);
        scene.add(this.trajectory_mesh);
    }

    // updateTrajectory() {
    //     this.line.verticesNeedUpdate = true;
    //     this.geometry.verticesNeedUpdate = true;
    //     if (this.geometry.vertices.length >= trajectory_length) {
    //         this.geometry.vertices.shift();
    //     } 
    //     this.geometry.vertices.push(new THREE.Vector3(this.th1, this.th2, 0));
    //     this.line.setGeometry(this.geometry);
    // }

    reset(th1, th2) {
        this.th1 = th1;
        this.th2 = th2;
        this.pth1 = 0;
        this.pth2 = 0;
    }

    // Unlike th0 and th1 from the pendulum equation, th1 is the angle of the 
    // lower rod as measured from th0.
    setAngle(th1, th2) {
        this.pivot1.mesh.position.set(0, 0, pz);
        
        let sinTh1 = Math.sin(th1);
        let cosTh1 = Math.cos(th1);
        let sinTh2 = Math.sin(th2);
        let cosTh2 = Math.cos(th2);
        

        this.rod1.mesh.position.set(rh/2*sinTh1, -rh/2*cosTh1, rz);
        this.rod1.mesh.quaternion.setFromAxisAngle(axis, th1);
        
        this.pivot2.mesh.position.set(rh*sinTh1, -rh*cosTh1, pz);

        this.rod2.mesh.position.set(rh*(sinTh1 + sinTh2/2), -rh*(cosTh1 + cosTh2/2), rz);
        this.rod2.mesh.quaternion.setFromAxisAngle(axis, th2);

        this.pivot3.mesh.position.set(rh*(sinTh1 + sinTh2), -rh*(cosTh1 + cosTh2), rz);
    }

    step(h) {
        [this.th1, this.th2, this.pth1, this.pth2] = rk4Step(this.f, [this.th1, this.th2, this.pth1, this.pth2], h);
        this.setAngle(this.th1, this.th2);
        this.trajectory_line.advance(this.pivot3.mesh.position);
        // this.updateTrajectory();    
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
        new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: vs,
            fragmentShader: fs
        }),
    );
    scene.add(noiseMesh);

    let n = 20
    let r1 = Math.PI*Math.random()+Math.PI/2, r2 = 2*Math.PI*Math.random();
    for (let i = 0; i < n; i++) {
        let th = r1 + .00001*i;
        pendulums.push(new Pendulum(
            new THREE.Color().setHSL(i/(n-1), .45, .7),
            new THREE.Color().setHSL(i/(n-1), .45, .6),
            new THREE.Color().setHSL(i/(n-1), .9, .6),
             .1, .1, th, th + r2)
        );
    }
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
    let d = (m*l**2);
    let a = (6/d);
    let f = g/l;
    return function(x) {
        let [th1, th2, pth1, pth2] = x;
        let b = 3*Math.cos(th1-th2);
        let c =  (16-9*(Math.cos(th1-th2)**2));
        let th1d = a * (2*pth1-b*pth2)/c;
        let th2d = a * (8*pth2-b*pth1)/c;
        let e = th1d*th2d*Math.sin(th1-th2);
        let pth1d = (-d/2) * (e+3*f*Math.sin(th1));
        let pth2d = (-d/2) * (-e+f*Math.sin(th2));
        return [th1d, th2d, pth1d, pth2d];
    }
}