var notify = document.createElement('div');
notify.id = "simple-translate-notify";
let notifyText = document.createElement('span');
let notifyCss = document.createElement('style');
notify.appendChild(notifyText);
notify.appendChild(notifyCss);

function init_notifyText() {
    if (pageLanguageState === "translated") {
        notifyText.textContent = "Translated";
    }
    else {
        notifyText.textContent = "Originnal";
    }
}

notifyCss.innerHTML = `
    #simple-translate-notify {
        position: fixed;
        z-index: 2147483647;
        top: 0;
        left: 0;
        border-radius: 5px;
        background-color: yellow;
        padding-left: 5px;
        padding-right: 5px;
    }
`;

function showNotify(time) {
    let notifyTimeOut = 0;
    if(notifyTimeOut) {
        clearTimeout(notifyTimeOut);
        document.body.removeChild(notify);
    };
    
    init_notifyText();

    document.body.appendChild(notify);

    notifyTimeOut = setTimeout(function() {
        document.body.removeChild(notify);
    }, time);
}