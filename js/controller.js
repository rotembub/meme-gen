'use strict'

var gElCanvas;
var gCtx;
var gIsClicked = false;
var gCurrImage;
var gSavedMemes;
var gSearchBy;
var gIsSearching = false;
var gWordsRevealed = false;
var gStartPos;
const gTouchEvs = ['touchstart', 'touchmove', 'touchend'];


function initCanvas() {
    gElCanvas = document.getElementById('canvas');
    setCanvasMeasures();
    gCtx = gElCanvas.getContext('2d');
    gSavedMemes = loadSavedMemes() // watchout
    addListeners();
}
// prototye
function loadSavedMemes() {
    var memes = loadFromStorage('savedMemes');
    console.log(memes);
    if (!memes) return [];
    return memes;
}

// click and drag functions:
function addListeners() {
    addMouseListeners();
    addTouchListeners();
    window.addEventListener('resize', () => {
        setCanvasMeasures();
        if (!getMeme()) return; //watchout 
        loadImage();
        renderText();
    })
}
function addMouseListeners() {
    gElCanvas.addEventListener('mousemove', onMove)
    gElCanvas.addEventListener('mousedown', onDown)
    gElCanvas.addEventListener('mouseup', onUp)
}
function addTouchListeners() {
    gElCanvas.addEventListener('touchmove', onMove)
    gElCanvas.addEventListener('touchstart', onDown)
    gElCanvas.addEventListener('touchend', onUp)
}

function onDown(event) {
    var pos = getEvPos(event);
    console.log(pos);
    gIsClicked = isLineClicked(pos);
    gStartPos = pos;
    if (gIsClicked) {
        renderText(); // WATCHOUT 
        drawLineBorders();
        document.body.style.cursor = 'grabbing';
    } else renderText();
}

function onMove(event) {
    const pos = getEvPos(event);
    if (gIsClicked) {
        const dx = pos.x - gStartPos.x;
        const dy = pos.y - gStartPos.y;
        gStartPos = pos;
        changeTextPos(dx, dy);
        renderText();
    }
}

function onUp(event) {
    gIsClicked = false;
    document.body.style.cursor = 'auto';
}

function getEvPos(ev) {
    var pos = {
        x: ev.offsetX,
        y: ev.offsetY
    }
    if (gTouchEvs.includes(ev.type)) {
        console.log(ev);
        ev.preventDefault()
        ev = ev.changedTouches[0]
        pos = {
            x: ev.pageX - ev.target.offsetLeft - ev.target.offsetParent.offsetLeft,  // did these changes on saturday 9pm hopefully didnt break the code
            y: ev.pageY - ev.target.offsetTop - ev.target.offsetParent.offsetTop    // there was problems locating touches on the canvas
        }
    }
    console.log(pos);
    return pos
}

function renderImages() {
    var images = getImgs();
    var elGallery = document.querySelector('.img-gallery');
    var strHtml = images.map(img => {
        if (gIsSearching) {
            if (img.keywords.includes(gSearchBy)) return `<img src="${img.url}" onclick="openEditor(this.name)" alt="" name="${img.id}">`;
        } else {
            return `<img src="${img.url}" onclick="openEditor(this.name)" alt="" name="${img.id}">`;
        }
    })
    elGallery.innerHTML = strHtml.join('');
    gIsSearching = false; // WATCHOUT
}

function openEditor(id) {
    setNewMeme();
    var elMain = document.querySelector('main');       ///////////////////////////
    elMain.style.display = 'none';                  //////////////////////////////
    setCurrMemeImg(id);
    var elEditor = document.querySelector('.meme-editor');
    loadImage();
    drawImg();
    elEditor.classList.add('opened');
}

function onCloseEditor(elEditor) {
    document.querySelector('.share-container').innerHTML = '';
    elEditor.classList.remove('opened');
    var elMain = document.querySelector('main');       ///////////////////////////
    elMain.style.display = 'block';                         /////////////////////
}
// seperating into load and draw functions to prevent image from flashing on change to the canvas
function loadImage() {
    var imgSource = getgMemeImg();
    gCurrImage = new Image();
    gCurrImage.src = imgSource;
    gCurrImage.onload = () => {
        gCtx.drawImage(gCurrImage, 0, 0, gElCanvas.width, gElCanvas.height);
        initialText();
    };
}
function drawImg() {
    gCtx.drawImage(gCurrImage, 0, 0, gElCanvas.width, gElCanvas.height);
}

function clearCanvas() {
    gCtx.clearRect(0, 0, gElCanvas.width, gElCanvas.height);
}

function onUpdateText(val) {
    updateMemeText(val);
    renderText();
}

function renderText() {
    clearCanvas();
    drawImg();
    initialText();
}

function onChangeTextSize(isIncrease) {
    if (isIncrease) increaseTextSize();
    else decreaseTextSize();
    renderText();
}

function onMoveLine(isUp) {
    if (isUp) moveTextUp();
    else moveTextDown();
    renderText();
}

function onNewLineInput() {
    document.querySelector('#upper-text').value = '';
    createNewLine(undefined, getCanvasMeasures()); // WATCHOUT 
    setCurrLine(); // WATCHOUT 
}

function onSwitchLine() {
    setCurrLine(); // WATCHOUT 
    renderText();
    drawLineBorders();
}

function onSetFont(font) {
    updateLineFont(font);
    renderText();
}
function onSetColor(color) {
    updateLineColor(color);
    renderText();
}
function onAlignLines(alignment) {
    alignLines(alignment, getCanvasMeasures());
    renderText();
}

function onDeleteLine() {
    deleteSelectedLine();
    renderText();
}

function onDownloadImg(elAnchor) {
    elAnchor.href = gElCanvas.toDataURL('image/jpeg');
    gSavedMemes.push(elAnchor.href);
    saveToStorage('savedMemes', gSavedMemes);
}

function initialText() {
    var meme = getMeme();
    meme.lines.forEach(line => {
        gCtx.font = `${line.size}px ${line.font}`; // this first so the line width would be correct
        setLineLength(line, gCtx.measureText(line.txt).width);
        var x = line.pos.x;
        var y = line.pos.y;
        gCtx.shadowBlur = 0;
        gCtx.lineWidth = 2;
        gCtx.strokeStyle = 'black';
        gCtx.fillStyle = `${line.color}`;
        gCtx.fillText(line.txt, x, y);
        gCtx.strokeText(line.txt, x, y);
    });
}


function drawLineBorders() {
    var selectedLine = getSelectedLine();
    gCtx.font = selectedLine.font;
    gCtx.beginPath();
    gCtx.rect(selectedLine.pos.x, selectedLine.pos.y, selectedLine.lineLength, -selectedLine.size);
    gCtx.strokeStyle = 'white';
    gCtx.stroke();
}

function onUpload(ev) {
    loadInputImage(ev, drawImg);
}

function loadInputImage(ev, drawImage) {
    var reader = new FileReader();
    reader.onload = function (event) {
        var img = new Image();
        img.onload = drawImage.bind(null, img);
        img.src = event.target.result;
        gCurrImage = img;
    }
    reader.readAsDataURL(ev.target.files[0]);
}
// see if can display them when clicked
function displaySavedMemes() {
    var elGallery = document.querySelector('.img-gallery');
    var strHtml = gSavedMemes.map(meme => {
        return `<img src="${meme}" alt="">`
    })
    elGallery.innerHTML = strHtml.join('');
}

function onSetSearchBy(word) {
    if (!word) {
        renderImages();
        return;
    }
    gIsSearching = true;
    gSearchBy = word;
    console.log(gSearchBy);
    renderImages();
}

function displayKeyWords() {
    var keywords = getKeyWords();
    var strHTML = ''
    for (var key in keywords) {
        strHTML += `<span style="font-size: calc(16px + ${keywords[key]}px);" data-trans="${key}" onclick="onIncreaseFont('${key}')">${key}</span>`;
    }
    document.querySelector('.keywords').innerHTML = strHTML;
    if (gWordsRevealed) onRevealKeyWords();
}

function onRevealKeyWords(elBtn) {
    if (gWordsRevealed) {
        var elSpans = document.querySelectorAll('.search-bar .keywords span');
        elSpans.forEach(elSpan => {
            elSpan.classList.add('reveal');
        });
        elBtn.innerText = 'Less';
    } else {
        elBtn.innerText = 'More';
        displayKeyWords();
    }
}
function onMoreLessKeywords(elBtn) {
    gWordsRevealed = !gWordsRevealed;
    onRevealKeyWords(elBtn);
}

function onIncreaseFont(word) {
    increaseRate(word);
    displayKeyWords();
    onSetSearchBy(word);
}
// giving canvas size to other functions to create proper line lengths
function getCanvasMeasures() {
    if (window.innerWidth <= 850) {
        return { width: 250, height: 250 };
    }
    return { width: 500, height: 500 };
}
// setting canvas size:
function setCanvasMeasures() {
    if (window.innerWidth <= 850) {
        if (gElCanvas.width === 250) return; //WATCHOUT
        gElCanvas.width = 250;
        gElCanvas.height = 250;
    } else {
        if (gElCanvas.width === 500) return; //WATCHOUT
        gElCanvas.width = 500;
        gElCanvas.height = 500;
    }
}

function onToggleMenu() {
    document.body.classList.toggle('menu-open');
}

function onAddStickers(elEmoji) {
    console.log(elEmoji.innerText);
    createNewLine(elEmoji.innerText, getCanvasMeasures());
    setCurrLine();
    renderText();
}

function renderStickers() {
    var stickers = getStickers();
    var elStickersContainer = document.querySelector('.stickers-container');
    var strHtml = stickers.map(sticker => {
        return `<span onclick="onAddStickers(this)">${sticker}</span>`
    });
    elStickersContainer.innerHTML = strHtml.join('');
}

function onShowNext(isNext) {
    showNext(isNext);
    renderStickers();
}

function onSetLang(lang) {
    setLang(lang);
    var elBody = document.querySelector('body');
    if (lang === 'he') elBody.classList.add('hebrew');
    else elBody.classList.remove('hebrew');
    onTranslate();
}

function onTranslate() {
    var elements = document.querySelectorAll('[data-trans]');
    elements.forEach(element => {
        var elDataTrans = element.dataset.trans;
        if (element.nodeName === 'INPUT') element.placeholder = getTrans(elDataTrans);
        else element.innerText = getTrans(elDataTrans);
    });
}

function onMarkHeadings(pressed) {
    var elHeadingGallery = document.querySelector('.h-gallery');
    var elHeadingMemes = document.querySelector('.h-memes');
    if (pressed === 'gallery') {
        renderImages();
        if (elHeadingGallery.classList.contains('pressed')) return;
        elHeadingMemes.classList.toggle('pressed');
        elHeadingGallery.classList.toggle('pressed');
    } else if (pressed === 'memes') {
        displaySavedMemes();
        if (elHeadingMemes.classList.contains('pressed')) return;
        elHeadingMemes.classList.toggle('pressed');
        elHeadingGallery.classList.toggle('pressed');
    }
}