import * as THREE from "three";
import { MeshLine, MeshLineMaterial } from "three.meshline";

let container;
let camera, scene, renderer;

const rodL = .45;
const pivotDepth = -1;
const rodDepth = -2;
const trajectoryDepth = -0.5;
const axis = new THREE.Vector3(0, 0, 1);
const g = 9.8;

const trajectory_length = 150;

class Pendulum {
    constructor(rodColor, pivotColor, trajectoryColor, m, l, th1, th2, depth) {
        this.depth = depth;

        this.pivot1 = createMeshObj(new THREE.CircleBufferGeometry(0.025, 64), new THREE.MeshBasicMaterial);
        this.pivot1.mat.color.set(pivotColor);
        
        this.rod1 = createMeshObj(new THREE.PlaneBufferGeometry(0.025, rodL), new THREE.MeshBasicMaterial);
        this.rod1.mat.color.set(rodColor);
        
        this.pivot2 = createMeshObj(new THREE.CircleBufferGeometry(0.025, 64), new THREE.MeshBasicMaterial);
        this.pivot2.mat.color.set(pivotColor);
        
        this.rod2 = createMeshObj(new THREE.PlaneBufferGeometry(0.025, rodL), new THREE.MeshBasicMaterial);
        this.rod2.mat.color.set(rodColor);
        
        this.pivot3 = createMeshObj(new THREE.CircleBufferGeometry(0.025, 64), new THREE.MeshBasicMaterial);
        this.pivot3.mat.color.set(pivotColor); 

        this.reset(th1, th2);
        this.setAngle();

        this.f = makeDoublePendulumEqn(m, l);
        this.trajectory_geometry = new THREE.Geometry();
        for (let i = 0; i < trajectory_length; i++) {
            this.trajectory_geometry.vertices.push(this.pivot3.mesh.position);
        }
        this.trajectory_line = new MeshLine();
        this.trajectory_line.setGeometry(this.trajectory_geometry, p => p);
        this.trajectory_material = new MeshLineMaterial({
            color: trajectoryColor, 
            lineWidth: .005,
            transparent: true,
            opacity: .5,
        })

        this.trajectory_mesh = new THREE.Mesh(this.trajectory_line.geometry, this.trajectory_material);
        scene.add(this.trajectory_mesh);
    }

    reset(th1, th2) {
        this.th1 = th1;
        this.th2 = th2;
        this.pth1 = 0;
        this.pth2 = 0;
    }

    setAngle() {
        let sinTh1 = Math.sin(this.th1);
        let cosTh1 = Math.cos(this.th1);
        let sinTh2 = Math.sin(this.th2);
        let cosTh2 = Math.cos(this.th2);
        
        this.pivot1.mesh.position.set(0, 0, pivotDepth);

        this.rod1.mesh.position.set(rodL/2*sinTh1, -rodL/2*cosTh1, rodDepth);
        this.rod1.mesh.quaternion.setFromAxisAngle(axis, this.th1);
        
        this.pivot2.mesh.position.set(rodL*sinTh1, -rodL*cosTh1, pivotDepth);

        this.rod2.mesh.position.set(rodL*(sinTh1 + sinTh2/2), -rodL*(cosTh1 + cosTh2/2), rodDepth);
        this.rod2.mesh.quaternion.setFromAxisAngle(axis, this.th2);

        this.pivot3.mesh.position.set(rodL*(sinTh1 + sinTh2), -rodL*(cosTh1 + cosTh2), pivotDepth);
    }

    step(h) {
        [this.th1, this.th2, this.pth1, this.pth2] = rk4Step(this.f, [this.th1, this.th2, this.pth1, this.pth2], h);
        this.setAngle();
        let tr = new THREE.Vector3()
        tr.copy(this.pivot3.mesh.position);
        tr.setZ(trajectoryDepth);
        this.trajectory_line.advance(tr);
    }
}

let h = .005;
let pendulums = [];

init();
animate();

function animate(timestamp) {
    requestAnimationFrame(animate);
    // uniforms["uTime"].value = timestamp / 1000;
    renderer.clear()
    
    renderer.render(scene, camera);
    
    for (let p of pendulums) {
        p.step(h);
    }
}

function init() {
    container = document.getElementById('container');
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 100);
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(new THREE.Color(.1, .1,.1));
    container.appendChild(renderer.domElement);

    onWindowResize();
    window.addEventListener('resize', onWindowResize, false);

    let n = 20;
    let color = "rainbow";
    let r1 = Math.PI*Math.random()+Math.PI/2, r2 = 2*Math.PI*Math.random();
    for (let i = 0; i < n; i++) {
        let th = r1 + .00001*i;
        let colors;
        let p = i/(n-1);
        if (color == "rainbow") {
            colors = [
                new THREE.Color().setHSL(p, .45, .6),
                new THREE.Color().setHSL(p, .45, .5),
                new THREE.Color().setHSL(p, .9, .6),
            ];
        } else {
            let hue = 225/360;
            colors = [
                new THREE.Color().setHSL(hue-.02, 4+p*.4, .2+p*.7),
                new THREE.Color().setHSL(hue-.02, 4+p*.4, .2+p*.7),
                new THREE.Color().setHSL(hue-.05, 4+p*.6, .2+p*.7),
            ];
        }
        
        pendulums.push(new Pendulum(
            ...colors,
             .1, .1, th, th + r2, .01*i)
        );
    }
}

function createMeshObj(geometry, mat) {
    let mesh = new THREE.Mesh(geometry, mat);
    // mesh.frustumCulled = false;
    scene.add(mesh);
    return {mesh: mesh, mat: mat, geometry: geometry};
}

function onWindowResize() {
    let ratio = window.innerWidth/window.innerHeight
    camera.left = -ratio;
    camera.right = ratio;
    // uniforms["uAspect"].value = ratio; 
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