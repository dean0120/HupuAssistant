// ==UserScript==
// @name         虎扑助手
// @namespace    http://tampermonkey.net/
// @version      0.5.2
// @description  在浏览虎扑时可一键查看所有图片和视频
// @author       landswimmer
// @match        https://bbs.hupu.com/*.html
// @connect      hupu.com
// @grant        GM_xmlhttpRequest
// @license      GPLv3
// ==/UserScript==

(function () {
    'use strict';
    //第一部分，逻辑相关
    let imgList = [];
    let imgBuffer = [];
    let pageIndex = 1;
    let re = /src='.*?'/g;
    let baseUrl = 'https://m.hupu.com/api/v1/bbs-thread-frontend/' + window.location.href.substr(21, window.location.href.length - 26) + '?page=';//提取帖子id

    function dataHandler(eachReply) {
        let reResult = eachReply.content.match(re);
        if (reResult) {
            reResult.forEach(rawSrc => {
                if (rawSrc.match(/\.mp4/g)) {
                    imgList.push(rawSrc.substr(5, rawSrc.length - 6).replace(/\\/g, ""));
                } else if (rawSrc.match(/\?/g)) {
                    imgList.push(rawSrc.match(/src=.*?\?/g)[0].replace(/\\/g, "").substr(5, rawSrc.length - 7));
                    let bufferNode = new Image();
                    bufferNode.src = rawSrc.match(/src=.*?\?/g)[0].replace(/\\/g, "").substr(5, rawSrc.length - 7);
                    imgBuffer.push(bufferNode);
                }
            });
        }
    }

    let details = {
        method: "GET",
        onload: (e) => {
            let responseData = JSON.parse(e.response).data;
            if (pageIndex === 1) {
                dataHandler(responseData.t_detail);
                responseData.lr_list.forEach(dataHandler);
            }
            responseData.r_list.forEach(dataHandler);
            if (++pageIndex <= responseData.r_total_page) {
                sendRequest();
            }
        }
    }

    function sendRequest() {
        details.url = baseUrl + pageIndex;
        GM_xmlhttpRequest(details);
    }

    sendRequest();

    //第二部分，布局相关

    let picModeBtn = document.createElement("div");
    picModeBtn.innerHTML = "看图";
    picModeBtn.style.cssText = "\
        position: fixed;\
        right: calc(2% + 4px);\
        bottom: 50px;\
        border: 1px solid #999;\
        border-radius: 3px;\
        height: 40px;\
        width: 40px;\
        display: flex;\
        justify-content: center;\
        align-items: center;\
        cursor: pointer;\
    ";

    let picModeDiv = document.createElement("div");
    picModeDiv.id = "insertDiv";
    picModeDiv.style.cssText = "\
        position: fixed;\
        top: 0;\
        width: 100vw;\
        height: 100vh;\
        z-index: 1000;\
        display: flex;\
        justify-content: center;\
        align-items: center;\
        background-color: #222;\
    ";

    let placeHolder = document.createElement("div");
    placeHolder.innerHTML = "本帖没有图片哦";
    placeHolder.style.display = "none";
    placeHolder.style.color = "white";

    let pic = document.createElement("img");
    pic.style.display = "none";
    pic.style.maxWidth = "100vw";
    pic.style.maxHeight = "100vh";

    let mp4 = document.createElement("video");
    mp4.controls = "true";
    mp4.style.display = "none";
    mp4.style.maxHeight = "100vh";
    mp4.style.maxWidth = "100vw";

    let cssTouchPad = "\
        visibility: hidden;\
        position: fixed;\
        top: calc(50vh - 25px);\
        border: 25px solid transparent;\
        height: 0;\
        width: 0;\
        mix-blend-mode: difference;\
        cursor: pointer;\
    ";

    let touchPadLeft = document.createElement("div");
    touchPadLeft.style.cssText = cssTouchPad;
    touchPadLeft.style.left = "20px";
    touchPadLeft.style.borderRightColor = "rgba(128,128,128,0.8)";

    let touchPadRight = document.createElement("div");
    touchPadRight.style.cssText = cssTouchPad;
    touchPadRight.style.right = "20px";
    touchPadRight.style.borderLeftColor = "rgba(128,128,128,0.8)";

    let closeBtn = document.createElement("div");
    closeBtn.innerHTML = "X";
    closeBtn.style.cssText = "\
        position: fixed;\
        top: 20px;\
        right: 30px;\
        color: rgba(128,128,128,0.8);\
        font-size: 30px;\
        mix-blend-mode: difference;\
        cursor: pointer;\
    ";

    let fragment = document.createDocumentFragment();
    let rawFragment = document.createDocumentFragment();
    picModeDiv.appendChild(pic);
    picModeDiv.appendChild(placeHolder);
    picModeDiv.appendChild(mp4);
    picModeDiv.appendChild(touchPadLeft);
    picModeDiv.appendChild(touchPadRight);
    picModeDiv.appendChild(closeBtn);
    fragment.appendChild(picModeDiv);

    //第三部分，交互控制相关
    let i = 0;
    function imgSwitch() {
        if (imgList[i].match(/\.mp4/)) {
            mp4.src = imgList[i];
            mp4.style.display = "initial";
            pic.style.display = "none";
        } else {
            pic.src = imgList[i];
            pic.style.display = "initial";
            mp4.style.display = "none";
        }
        if (i == 0) {
            touchPadLeft.style.visibility = "hidden";
        } else {
            touchPadLeft.style.visibility = "visible";
        }
        if (i == imgList.length - 1) {
            touchPadRight.style.visibility = "hidden";
        } else {
            touchPadRight.style.visibility = "visible";
        }
    }
    function closeHandler() {
        placeHolder.style.display = "none";
        pic.style.display = "none";
        mp4.style.display = "none";
        touchPadRight.style.visibility = "hidden";
        touchPadLeft.style.visibility = "hidden";
        if (imgList.length) {
            i = 0;
            pic.src = imgList[i];
        }
        fragment.appendChild(document.getElementById("insertDiv"));
        document.body.appendChild(rawFragment);
    }

    document.onkeydown = (e) => {
        if (rawFragment) {
            if (e.keyCode === 39 && (i < imgList.length - 1)) {
                i++;
                imgSwitch();
            }
            if (e.keyCode === 37 && i > 0) {
                i--;
                imgSwitch();
            }
            if (e.keyCode === 27) {
                closeHandler();
            }
        }
    }
    touchPadLeft.onclick = () => {
        if (i > 0) {
            i--;
            imgSwitch();
        }
    }
    touchPadRight.onclick = () => {
        if (i < imgList.length - 1) {
            i++;
            imgSwitch();
        }
    }
    closeBtn.onclick = closeHandler;
    picModeBtn.onclick = function () {
        imgList = [...new Set(imgList)];//抄袭代码
        rawFragment.appendChild(document.getElementsByClassName("hp-wrap details")[0]);
        if (imgList.length) {
            imgSwitch();
        } else {
            placeHolder.style.display = "initial";
        }
        document.body.appendChild(fragment);
    }

    document.body.appendChild(picModeBtn);
})();