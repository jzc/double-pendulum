import * as THREE from "three";
import { MeshLine, MeshLineMaterial } from "three.meshline";
import * as dat from "dat.gui";

let container;
let camera, scene, renderer;

const rodL = .48;
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

        this.trajectoryGeometry = new THREE.Geometry();
        this.trajectoryLine = new MeshLine();
        this.reset(th1, th2);

        this.trajectoryMaterial = new MeshLineMaterial({
            color: trajectoryColor, 
            lineWidth: .005,
            transparent: true,
            opacity: .5,
        })


        this.updateEqn(m, l);

        this.trajectoryMesh = new THREE.Mesh(this.trajectoryLine.geometry, this.trajectoryMaterial);
        scene.add(this.trajectoryMesh);
    }

    updateEqn(m, l) {
        this.f = makeDoublePendulumEqn(m, l);
    }

    reset(th1, th2) {
        this.th1 = th1;
        this.th2 = th2;
        this.pth1 = 0;
        this.pth2 = 0;
        this.trajectoryGeometry.vertices = [];
        for (let i = 0; i < trajectory_length; i++) {
            this.trajectoryGeometry.vertices.push(this.pivot3.mesh.position);
        }
        this.setAngle()
        this.trajectoryLine.setGeometry(this.trajectoryGeometry, p => p);

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
        this.trajectoryLine.advance(tr);
    }
}

const n = 20;
const dth = .0001;
let h = .005;
let pendulums = [];
let m = .1, l = .1;

let r1 = 180*Math.random()+90, r2 = 360*Math.random();
let rth1 = Math.round(r1), rth2 = Math.round((r1+r2) % 360);

function toDegree(rad) {
    return rad*180/Math.PI;
}

function toRadian(deg) {
    return deg*Math.PI/180;
}

let gui = new dat.GUI();

function Config() {
    this.reset = function() {
        for (let i = 0; i < n; i++) {
            pendulums[i].reset(toRadian(this.th1 + dth*i), toRadian(this.th2));
            pendulums[i].updateEqn(this.m, this.l);
        }
    }
    this.randomize = function() {
        let r1 = 180*Math.random()+90, r2 = 360*Math.random();
        this.th1 = Math.round(r1), this.th2 = Math.round((r1+r2) % 360);
        // Iterate over all controllers
        for (var i in gui.__controllers) {
            gui.__controllers[i].updateDisplay();
        }

        this.reset()
    }

    this.th1 = rth1;
    this.th2 = rth2;
    this.m = m;
    this.l = l;
}

let config = new Config();

window.onload = function() {
    gui.add(config, "reset");
    gui.add(config, "randomize");
    gui.add(config, "th1", 0, 360, 1);
    gui.add(config, "th2", 0, 360, 1);
    // gui.add(config, "m", .1, 5, .1);
    // gui.add(config, "l", .1, 5, .1);
}

init();
animate();

function animate(timestamp) {
    requestAnimationFrame(animate);
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

    let color = "rainbow";
    for (let i = 0; i < n; i++) {
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
            m, l, toRadian(rth1 + dth*i), toRadian(rth2), .01*i)
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
    if (window.innerHeight > window.innerWidth) {
        let ratio = window.innerHeight/window.innerWidth
        camera.bottom = -ratio;
        camera.top = ratio;
        camera.left = -1;
        camera.right = 1;

    } else {
        let ratio = window.innerWidth/window.innerHeight
        camera.left = -ratio;
        camera.right = ratio;
        camera.bottom = -1;
        camera.top = 1;
    }

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