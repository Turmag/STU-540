//Wacom tablet object
var wacom = new wacomstu540();

//Defs
var image;
var poly;
var pen_state = false;
var imgreq = false;
var lastPressure = 0.0;

//Canvas stuff, used to create images and get it pixels
var canvas = document.getElementById('myCanvas');
var context = myCanvas.getContext('2d');
var img = new Image();

//Add hid listeners
wacom.onHidChange(function (e) {
    e === 'connect' ? '' : (wacom.device = null);
});

//Connect and setup initial state and events
async function connect() {
    if (await wacom.connect()) {
        await wacom.clearScreen();
        //await wacom.setBackgroundColor(colo.value)
        await wacom.setPenColorAndWidth(cola.value, pens.value);
        await wacom.setWritingMode(1);
        await wacom.setWritingArea({ x1: 0, y1: 0, x2: 800, y2: 480 });
        await wacom.setInking(true);
        wacom.onPenData(function (pen) {
            pointevent(pen.press > 0 && imod.checked, pen.cx, pen.cy, pen.press);
        });
        clearscreen();
    }
}

//Control actions

async function inkmode() {
    await wacom.setInking(imod.checked == 1);
}
async function writingmode() {
    await wacom.setWritingMode(wmod.checked == 1 ? 1 : 0);
}
async function clearscreen() {
    await wacom.clearScreen();
    context.fillStyle = colo.value;
    context.fillRect(0, 0, canvas.width, canvas.height);
    ssvvgg.innerHTML = '';
}
async function changebackground() {
    await wacom.setBackgroundColor(colo.value);
    await clearscreen();
}
async function adjustbrigtness() {
    console.log('do not call this often');
    await wacom.setBacklight(brig.value);
}
async function changepen() {
    await wacom.setPenColorAndWidth(cola.value, pens.value);
}
async function sendimage() {
    await wacom.setImage(image);
    imgreq = false;
    ssvvgg.innerHTML = '';
    await inkmode();
}

//Pressure ink rendering helpers

//Obtain difference between 2 numbers
function pressdiff(a, b) {
    if (a > b) return a - b;
    else return b - a;
}
//Transform stroke according the pressure level
function makestroke(v) {
    let pf = lastPressure + 0.5; //Shift scale (0.5-1.5) so it does magnification and reduction
    return Math.max(v * pf, 0.5); //Ensure some width on the product
}
//Add a polyline to the chain
function addpoly() {
    poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    poly.setAttributeNS(
        null,
        'style',
        'fill:none;stroke:' +
            cola.value +
            ';stroke-width:' +
            makestroke(parseInt(pens.value) + 1) +
            ';'
    );
    ssvvgg.append(poly);
}
//Adds a point to the last polyline
function polypoint(x, y) {
    var point = ssvvgg.createSVGPoint();
    point.x = x;
    point.y = y;
    poly.points.appendItem(point);
}

//Pen event handler
async function pointevent(z, x, y, p) {
    // State just changed?
    if (z != pen_state) {
        if (z) {
            addpoly();
            //Handle repeat "button" zone
            if (x > 580 && y < 50 && !imgreq) {
                //Disable inking and load bg image, inking is reenabled on image load
                await wacom.setInking(false);
                setTimeout(sendimage, 10);
                imgreq = true;
            }
        } else polypoint(x, y); //Finish the pointlist
        pen_state = z;
    }
    //Is touching screen?
    if (z) {
        //check if need to create new polyline with better fit stroke
        if (pressdiff(p, lastPressure) > 0.02) {
            //Add a connection point to the last polyline
            polypoint(x, y);
            lastPressure = p;
            addpoly();
        }
        //Add the point to the polyline
        polypoint(x, y);
    }
}

//Callback for image loading. Manipulates the image and converts to 24.BGR from stretched canvas
async function loadImg() {
    context.drawImage(img, 0, 0, 800, 480);
    if (!img.src.includes('wacom.png')) {
        //Unrestrict inking area
        await wacom.setWritingArea({ x1: 0, y1: 0, x2: 800, y2: 480 });
    } else {
        //Restrict inking area
        await wacom.setWritingArea({ x1: 16, y1: 50, x2: 800 - 16, y2: 480 - 16 });
        //Add text to image
        context.font = '22px Arial';
        var date = new Date().toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        context.fillText('Signed in XXXXXXXX at ' + date, 130, 450);
    }
}

//Helper to download the signature SVG
function saveSvg(svgEl, name) {
    svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    var svgData = svgEl.outerHTML;
    var preface = '<?xml version="1.0" standalone="no"?>\r\n';
    var svgBlob = new Blob([preface, svgData], { type: 'image/svg+xml;charset=utf-8' });
    var svgUrl = URL.createObjectURL(svgBlob);
    var downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = name;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}
