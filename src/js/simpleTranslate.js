//init currentTargetLanguage
browser.storage.local.get('target_lang', (result) => {
    if(result.target_lang) {
        currentTargetLanguage = result.target_lang;
    }
    else {
        currentTargetLanguage = browser.i18n.getUILanguage();
    }
})

//if touch with 3 fingers
var inject_select_html = document.createElement('div');
var time_temp = 0;
var one_click_time_out;
var inject_select_html_state = 0;
document.addEventListener('touchstart', function(event) {
    if(event.touches.length === 3) {
        let current_time = new Date().getTime();
        if (time_temp) {
            //double click
            if (current_time - time_temp < 200) {
                clearTimeout(one_click_time_out);
                if (!inject_select_html_state) {
                    readTextFile(browser.runtime.getURL("src/simpleSelect.html"), function(result){ 
                        inject_select_html.innerHTML = result;
                        document.body.appendChild(inject_select_html);
                        inject_select_html_state = 1;
                        //add event
                        var simple_translate_select = document.getElementById("simple-translate-select");
                            let langs = twpLang.getLanguageList_default();
                            const langsSorted = [];
                            for (const i in langs) {
                                langsSorted.push([i, langs[i]]);
                            }
                            langsSorted.sort(function (a, b) {
                                return a[1].localeCompare(b[1]);
                            });
                            langsSorted.forEach(value => {
                                const option = document.createElement("option");
                                option.value = value[0];
                                option.textContent = value[1];
                                simple_translate_select.appendChild(option);
                            });
                        
                        simple_translate_select.addEventListener('click', function(event) {
                            let option_value = event.target.getAttribute('value');
                            currentTargetLanguage = option_value;
    
                            //save last target lang
                            browser.storage.local.set({target_lang: currentTargetLanguage});

                            if (pageLanguageState === "original") {
                                translate();
                            }
                            else if (pageLanguageState === "translated") {
                                reverseToOriginal();
                                translate();
                            }
                            document.body.removeChild(inject_select_html);
                            inject_select_html_state = 0;

                            showNotify(2500);
                        });
                    });
                }
                else {
                    document.body.removeChild(inject_select_html);
                    inject_select_html_state = 0;
                }
                time_temp=0;
                
            }
        }
        else {
            //one click
            time_temp = current_time;
            if(!inject_select_html_state) {
                one_click_time_out = setTimeout(function(){
                    if (pageLanguageState === "original") {
                        translate();
                        showNotify(2000);
                    }
                    else if (pageLanguageState === "translated") {
                        reverseToOriginal();
                        showNotify(2500);
                    }
                    time_temp = 0;
                }, 200);
            }
        }
    }
});

document.addEventListener ('touchmove', function (event) {
    if (event.target.parentNode.className.indexOf ('noBounce') != -1 || event.target.className.indexOf ('noBounce') != -1 ) {
        event.preventDefault ();
    }
}, false);

function readTextFile(file, callback) {
    var rawFile = new XMLHttpRequest();
    rawFile.open("GET", file, false);
    rawFile.onreadystatechange = function () {
        if (rawFile.readyState === 4) {
            if (rawFile.status === 200 || rawFile.status == 0) {
                var allText = rawFile.responseText;
                callback(allText);
            }
        }
    }
    rawFile.send(null);
}