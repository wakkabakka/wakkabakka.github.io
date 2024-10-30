// ==UserScript==
// @name         Share Position + AFK
// @namespace    http://tampermonkey.net/
// @version      2024-10-30-1
// @description  Shift + I to share position, 'J' to afk.
// @author       baka multi
// @match        https://diep.io/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// @run-at       document-start
// @downloadURL  https://github.com/wakkabakka/wakkabakka.github.io/raw/refs/heads/main/main.user.js
// @updateURL    https://github.com/wakkabakka/wakkabakka.github.io/raw/refs/heads/main/main.user.js
// ==/UserScript==


//Shift + Iで自分の位置を共有を切り替え
//JキーでAFKを切り替え

const manual = false; //正しく描画されない場合はtrueにして、Xを押しながらミニマップを左上から右下に左クリックでドラッグ。

function afk() {
    const afk_key = 'j'
    let afk_enabled = false;
    let afk_x = 0;
    let afk_y = 0;
    let allow_distance = 300;
    let back_distance = 150;
    let key = { w: 23, a: 1, s: 19, d: 4 };
    let deltaX, deltaY;
    let back = false;
    const press = (key) => window.extern.onKeyDown(key);
    const release = (key) => window.extern.onKeyUp(key);

    function frame() {
        requestAnimationFrame(frame);
        if (!afk_enabled) return
        console.log(position_x, position_y)
        console.log(afk_x, afk_y)
        deltaX = Math.abs(position_x - afk_x);
        deltaY = Math.abs(position_y - afk_y);
        if (deltaX > allow_distance || deltaY > allow_distance) {
            back = true;
        }
        else {
            if (deltaX < back_distance && deltaY < back_distance) back = false;
            release(key.w);
            release(key.a);
            release(key.s);
            release(key.d);
        }
        if (back) {
            if (deltaX > back_distance) {
                if (position_x > afk_x) {
                    release(key.d);
                    press(key.a);
                }
                else {
                    release(key.a);
                    press(key.d);
                }
            }
            else {
                release(key.d);
                release(key.a);
            }

            if (deltaY > back_distance) {
                if (position_y > afk_y) {
                    release(key.s);
                    press(key.w);
                }
                else {
                    release(key.w);
                    press(key.s);
                }
            }
            else {
                release(key.w);
                release(key.s);
            }
        }
    }

    document.addEventListener('keydown', function(event) {
        if (event.key.toLowerCase() === afk_key) {
            afk_enabled = !afk_enabled;
            window.extern.inGameNotification(`AFK: ${afk_enabled ? 'ON' : 'OFF'}`,1000)
            if(afk_enabled) {
                afk_x = position_x;
                afk_y = position_y;
            }
            else {
                release(key.w);
                release(key.a);
                release(key.s);
                release(key.d);
            }
        }
    });
    frame();
}

let url;
fetch('https://api.ipify.org?format=json')
    .then(response => response.json())
    .then(data => {
    url = (data.ip === "126.163.132.193")
        ? "wss://192.168.1.100"
    : "wss://diep.wakka.blog";
    const wait = setInterval(() => {
        if (window.extern) {
            clearInterval(wait);
            afk();
            main();
        }
    });
})
    .catch(error => console.error('Error fetching IP address:', error));


let isactive = false;

const Constants = {
    ARENA_WIDTH: 26000,
    ARENA_HEIGHT: 26000
};

let position_x = 0;
let position_y = 0;
let screen_data = {
    arrow_x: 0,
    arrow_y: 0,
    minimap_x: 0,
    minimap_y: 0,
    minimap_width: 0,
    minimap_height: 0
};

let isXKeyPressed = false;
let startX, startY, endX, mx, my, mw, mh;

function getPolygonCenter(data) {
    let center = [0, 0];
    for (let [x, y] of data) {
        center[0] += x;
        center[1] += y;
    }
    center[0] /= data.length;
    center[1] /= data.length;
    return center;
}

const crc = CanvasRenderingContext2D.prototype;
const { beginPath: _beginPath, moveTo: _moveTo, lineTo: _lineTo, fill: _fill, strokeRect: _strokeRect } = crc;
let vertices = [];
let vertices_amount = -1;

crc.beginPath = function (...args) {
    vertices_amount = 0;
    vertices = [];
    _beginPath.apply(this, args);
};

crc.moveTo = function (...args) {
    vertices_amount++;
    vertices.push(args);
    _moveTo.apply(this, args);
};

crc.lineTo = new Proxy(_lineTo, {
    apply(target, context, args) {
        vertices_amount++;
        vertices.push(args);
        return Reflect.apply(target, context, args);
    }
});

crc.fill = function (...args) {
    const center = getPolygonCenter(vertices);
    if (this.fillStyle === "#000000" && this.globalAlpha > 0.949 && vertices_amount === 3) {
        _fill.apply(this, args);
        calculateArrowPosition(center);
        return;
    }
    vertices_amount = -1;
    vertices = [];
    _fill.apply(this, args);
};

crc.strokeRect = function (...args) {
    const transform = this.getTransform();
    screen_data.minimap_x = transform.e;
    screen_data.minimap_y = transform.f;
    screen_data.minimap_width = transform.a;
    screen_data.minimap_height = transform.d;
    _strokeRect.apply(this, args);
};

Object.freeze(crc);

function calculateArrowPosition(pos) {
    [screen_data.arrow_x, screen_data.arrow_y] = pos;
    const dx = screen_data.arrow_x - screen_data.minimap_x;
    const dy = screen_data.arrow_y - screen_data.minimap_y;
    position_x = (dx / screen_data.minimap_width) * Constants.ARENA_WIDTH;
    position_y = (dy / screen_data.minimap_height) * Constants.ARENA_HEIGHT;
}

const _toString = Function.prototype.toString;
Function.prototype.toString = function () {
    return this === crc.beginPath ? _toString.call(_beginPath) :
    this === crc.moveTo ? _toString.call(_moveTo) :
    this === crc.lineTo ? _toString.call(_lineTo) :
    this === crc.fill ? _toString.call(_fill) :
    this === crc.strokeRect ? _toString.call(_strokeRect) :
    _toString.call(this);
};



function main() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    document.body.appendChild(canvas);
    const MyClientId = crypto.randomUUID();
    let lobbyId = '';
    let name = '';

    window.extern.connectLobby = new Proxy(window.extern.connectLobby, {
        apply(target, thisArg, args) {
            lobbyId = window.__common__.active_gamemode !== 'sandbox' ? args[0].replaceAll('-', '') : window.__common__.party_link;
            return Reflect.apply(target, thisArg, args);
        }
    });

    window.extern.try_spawn = new Proxy(window.extern.try_spawn, {
        apply(target, thisArg, args) {
            name = args[0];
            return Reflect.apply(target, thisArg, args);
        }
    });

    const socket = new WebSocket(url);
    socket.onopen = () => {
        console.log("Connected");
        setInterval(() => {
            const position = getPosition();
            sendUpdate(MyClientId, lobbyId, position, name, getColorFromLobbyId(), !isactive);
        }, 250);
    };

    socket.onmessage = event => {
        const allClientsData = JSON.parse(event.data);
        renderClientPositions(allClientsData, MyClientId, lobbyId);
    };

    socket.onclose = () => {
        console.log('Disconnected');
    };

    function getPosition() {
        return { x: position_x, y: position_y };
    }

    function sendUpdate(clientId, lobbyId, position, name, color = "red", hidden) {
        socket.send(JSON.stringify({
            clientId,
            lobbyId: window.__common__.screen_state === 'in-game' ? lobbyId : 'dead',
            position,
            name,
            color,
            hidden
        }));
    }

    function renderClientPositions(allClientsData, MyClientId, lobbyId) {
        canvas.style.zIndex = '9999';
        canvas.style.position = 'fixed';





        if (!isactive) {canvas.style.display = "none"; return;}
        canvas.style.display = "block";
        for (const clientId in allClientsData) {
            const client = allClientsData[clientId];
            if (client.clientId === MyClientId || client.lobbyId !== lobbyId || (client.hidden && url == "wss://diep.wakka.blog")) continue;



            if (!manual) {
                const x = (canvas.width / Constants.ARENA_WIDTH) * client.position.x;
                const y = (canvas.width / Constants.ARENA_WIDTH) * client.position.y;
                canvas.style.left = `${screen_data.minimap_x}px`;
                canvas.style.top = `${screen_data.minimap_y}px`;
                canvas.width = screen_data.minimap_width;
                canvas.height = screen_data.minimap_height;
                ctx.fillStyle = client.color;
                ctx.beginPath();
                ctx.arc(x, y, screen_data.minimap_width / 50, 0, Math.PI * 2);
                ctx.fill();

                ctx.font = `${screen_data.minimap_width / 15}px Ubuntu`;
                ctx.lineWidth = screen_data.minimap_width / 235;
                ctx.fillStyle = 'white';
                ctx.strokeStyle = 'black';

                const truncatedName = truncateText(client.name, 15);
                ctx.fillText(truncatedName, x - ctx.measureText(truncatedName).width / 2, y - screen_data.minimap_width / 25);
                ctx.strokeText(truncatedName, x - ctx.measureText(truncatedName).width / 2, y - screen_data.minimap_width / 25);
            }
            else {
                canvas.style.left = `${mx}px`
                canvas.style.top = `${my}px`
                canvas.width = canvas.height = mw;
                const x = (canvas.width / Constants.ARENA_WIDTH) * client.position.x;
                const y = (canvas.width / Constants.ARENA_WIDTH) * client.position.y;
                ctx.fillStyle = client.color;
                ctx.beginPath();
                ctx.arc(x, y, canvas.width / 50, 0, Math.PI * 2);
                ctx.fill();

                ctx.font = `${canvas.width / 15}px Ubuntu`;
                ctx.lineWidth = canvas.width / 235;
                ctx.fillStyle = 'white';
                ctx.strokeStyle = 'black';

                const truncatedName = truncateText(client.name, 15);
                ctx.fillText(truncatedName, x - ctx.measureText(truncatedName).width / 2, y - canvas.width / 25);
                ctx.strokeText(truncatedName, x - ctx.measureText(truncatedName).width / 2, y - canvas.width / 25);
            }
        }
    }

    function truncateText(text, maxBytes) {
        let truncated = text;
        while (new TextEncoder().encode(truncated).length > maxBytes) {
            truncated = truncated.slice(0, -1);
        }
        return truncated;
    }

    function getColorFromLobbyId() {
        const colorCodes = ["blue", "red", "purple", "green"];
        return colorCodes[parseInt(window.__common__.party_link.slice(32, 33), 16)] || "red";
    }
}

document.addEventListener("keydown", (event) => {
    if (event.shiftKey && event.key === "I") {
        isactive = !isactive;
    }
});


document.addEventListener('keydown', (event) => {
    if (event.key === 'x' || event.key === 'X') {
        isXKeyPressed = true;
    }
});

document.addEventListener('keyup', (event) => {
    if (event.key === 'x' || event.key === 'X') {
        isXKeyPressed = false;
    }
});

document.addEventListener('mousedown', (event) => {
    if (isXKeyPressed) {
        startX = event.clientX;
        startY = event.clientY;
    }
});

document.addEventListener('mouseup', (event) => {
    if (isXKeyPressed && startX !== null) {
        endX = event.clientX;
        mx = startX;
        my = startY;
        mw = endX - startX;
        mh = screen_data.minimap_width;
        startX = null;
    }
});

