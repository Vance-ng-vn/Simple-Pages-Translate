var fooCount = 0;
let pageIsVisible = true;
let piecesToTranslate = [];
let attributesToTranslate = [];
let currentPageTranslatorService = "google";
let currentSourceLanguage = "auto";
let currentTargetLanguage = "vi";
let customDictionary = [];
let dontSortResults = true;
var translationRoutine_handler;
var pageLanguageState = "original";
let nodesToRestore = [];
function translate() {
    fooCount++;
    piecesToTranslate = getPiecesToTranslate();
    attributesToTranslate = getAttributesToTranslate();
    
    pageLanguageState = "translated";
    // currentSourceLanguage = source_lang;
    // currentTargetLanguage = target_lang;
    translationRoutine();
}

function reverseToOriginal(){
    iecesToTranslate = [];
    //disableMutatinObserver();
    pageLanguageState = "original";

    for (const ntr of nodesToRestore) {
        if (ntr.node === ntr.original) {
          if (ntr.node.textContent === ntr.translatedText) {
            ntr.node.textContent = ntr.originalText;
          }
        } else {
          ntr.node.replaceWith(ntr.original);
        }
        if (ntr.originalScale) {
          ntr.parentNode.style.transform = `scaleX(${ntr.originalScale}`;
        }
    }
    nodesToRestore = [];

    for (const ati of attributesToTranslate) {
        if (ati.isTranslated) {
            ati.node.setAttribute(ati.attrName, ati.original);
        }
    }
    attributesToTranslate = [];
}


const htmlTagsInlineText = ["#text", "a", "abbr", "acronym", "b", "bdo", "big", "cite", "dfn", "em", "i", "label", "q", "s", "small", "span", "strong", "sub", /*"sup",*/ "u", "tt", "var"];
const htmlTagsInlineIgnore = ["br", "code", "kbd", "wbr"]; // and input if type is submit or button, and <pre> depending on settings
const htmlTagsNoTranslate = ["title", "script", "style", "textarea", "svg", "template"];
function getPiecesToTranslate(root = document.documentElement) {
    const piecesToTranslate = [
      {
        isTranslated: false,
        parentElement: null,
        topElement: null,
        bottomElement: null,
        nodes: [],
      },
    ];
    let index = 0;
    let currentParagraphSize = 0;

    const getAllNodes = function (
      node,
      lastHTMLElement = null,
      lastSelectOrDataListElement = null
    ) {
        if (node.nodeType == 1 || node.nodeType == 11) {
            if (node.nodeType == 11) {
                lastHTMLElement = node.host;
                lastSelectOrDataListElement = null;
            } else if (node.nodeType == 1) {
                lastHTMLElement = node;
                const nodeName = node.nodeName.toLowerCase();

                if (nodeName === "select" || nodeName === "datalist")
                    lastSelectOrDataListElement = node;

                if (
                    htmlTagsInlineIgnore.indexOf(nodeName) !== -1 ||
                    isNoTranslateNode(node) ||
                    node.classList.contains("notranslate") ||
                    node.getAttribute("translate") === "no" ||
                    node.isContentEditable ||
                    node.classList.contains("material-icons") || // https://github.com/FilipePS/Traduzir-paginas-web/issues/481
                    node.classList.contains("material-symbols-outlined") ||
                    nodeName.startsWith("br-") || // https://github.com/FilipePS/Traduzir-paginas-web/issues/627
                    node.getAttribute("id") === "branch-select-menu" || // https://github.com/FilipePS/Traduzir-paginas-web/issues/570
                    (location.hostname === "twitter.com" &&
                    nodeName === "a" &&
                    (node.matches ? node.matches("article a") : true)) // https://github.com/FilipePS/Traduzir-paginas-web/issues/449
                ) {
                    if (piecesToTranslate[index].nodes.length > 0) {
                        currentParagraphSize = 0;
                        piecesToTranslate[index].bottomElement = lastHTMLElement;
                        piecesToTranslate.push({
                            isTranslated: false,
                            parentElement: null,
                            topElement: null,
                            bottomElement: null,
                            nodes: [],
                        });
                        index++;
                    }
                    return;
                }
            }

            function getAllChilds(childNodes) {
                Array.from(childNodes).forEach((_node) => {
                    const nodeName = _node.nodeName.toLowerCase();

                    if (_node.nodeType == 1) {
                        lastHTMLElement = _node;
                        if (nodeName === "select" || nodeName === "datalist")
                            lastSelectOrDataListElement = _node;
                    }

                    if (htmlTagsInlineText.indexOf(nodeName) == -1) {
                        if (piecesToTranslate[index].nodes.length > 0) {
                            currentParagraphSize = 0;
                            piecesToTranslate[index].bottomElement = lastHTMLElement;
                            piecesToTranslate.push({
                            isTranslated: false,
                            parentElement: null,
                            topElement: null,
                            bottomElement: null,
                            nodes: [],
                            });
                            index++;
                        }

                        getAllNodes(_node, lastHTMLElement, lastSelectOrDataListElement);

                        if (piecesToTranslate[index].nodes.length > 0) {
                            currentParagraphSize = 0;
                            piecesToTranslate[index].bottomElement = lastHTMLElement;
                            piecesToTranslate.push({
                            isTranslated: false,
                            parentElement: null,
                            topElement: null,
                            bottomElement: null,
                            nodes: [],
                            });
                            index++;
                        }
                    } else {
                        getAllNodes(_node, lastHTMLElement, lastSelectOrDataListElement);
                    }
                });
            }

            getAllChilds(node.childNodes);
            if (!piecesToTranslate[index].bottomElement) {
                piecesToTranslate[index].bottomElement = node;
            }
            if (node.shadowRoot) {
                getAllChilds(node.shadowRoot.childNodes);
                if (!piecesToTranslate[index].bottomElement) {
                    piecesToTranslate[index].bottomElement = node;
                }
            }
        } else if (node.nodeType == 3) {
            if (node.textContent.trim().length > 0) {
                if (!piecesToTranslate[index].parentElement) {
                    if (
                    node &&
                    node.parentNode &&
                    node.parentNode.nodeName.toLowerCase() === "option" &&
                    lastSelectOrDataListElement
                    ) {
                        piecesToTranslate[index].parentElement =
                            lastSelectOrDataListElement;
                        piecesToTranslate[index].bottomElement =
                            lastSelectOrDataListElement;
                        piecesToTranslate[index].topElement = lastSelectOrDataListElement;
                    } else {
                        let temp = node.parentNode;
                        const nodeName = temp.nodeName.toLowerCase();
                        while (
                            temp &&
                            temp != root &&
                            (htmlTagsInlineText.indexOf(nodeName) != -1 ||
                            htmlTagsInlineIgnore.indexOf(nodeName) != -1)
                        ) {
                            temp = temp.parentNode;
                        }
                        if (temp && temp.nodeType === 11) {
                            temp = temp.host;
                        }
                        piecesToTranslate[index].parentElement = temp;
                    }
                }
                if (!piecesToTranslate[index].topElement) {
                    piecesToTranslate[index].topElement = lastHTMLElement;
                }
                if (currentParagraphSize > 1000) {
                    currentParagraphSize = 0;
                    piecesToTranslate[index].bottomElement = lastHTMLElement;
                    const pieceInfo = {
                    isTranslated: false,
                    parentElement: null,
                    topElement: lastHTMLElement,
                    bottomElement: null,
                    nodes: [],
                    };
                    pieceInfo.parentElement = piecesToTranslate[index].parentElement;
                    piecesToTranslate.push(pieceInfo);
                    index++;
                }
                currentParagraphSize += node.textContent.length;
                piecesToTranslate[index].nodes.push(node);
                piecesToTranslate[index].bottomElement = null;
            }
        }
    };
    getAllNodes(root);

    if (
      piecesToTranslate.length > 0 &&
      piecesToTranslate[piecesToTranslate.length - 1].nodes.length == 0
    ) {
      piecesToTranslate.pop();
    }

    return piecesToTranslate;
}

function getAttributesToTranslate(root = document.body) {
const attributesToTranslate = [];

const placeholdersElements = root.querySelectorAll(
    "input[placeholder], textarea[placeholder]"
);
const altElements = root.querySelectorAll(
    'area[alt], img[alt], input[type="image"][alt]'
);
const valueElements = root.querySelectorAll(
    'input[type="button"], input[type="submit"], input[type="reset"]'
);
const titleElements = root.querySelectorAll("body [title]");

function hasNoTranslate(elem) {
    if (
    elem &&
    (elem.classList.contains("notranslate") ||
        elem.getAttribute("translate") === "no")
    ) {
    return true;
    }
}

placeholdersElements.forEach((e) => {
    if (hasNoTranslate(e)) return;

    const txt = e.getAttribute("placeholder");
    if (txt && txt.trim()) {
    attributesToTranslate.push({
        node: e,
        original: txt,
        attrName: "placeholder",
    });
    }
});

altElements.forEach((e) => {
    if (hasNoTranslate(e)) return;

    const txt = e.getAttribute("alt");
    if (txt && txt.trim()) {
    attributesToTranslate.push({
        node: e,
        original: txt,
        attrName: "alt",
    });
    }
});

valueElements.forEach((e) => {
    if (hasNoTranslate(e)) return;

    const txt = e.getAttribute("value");
    if (e.type == "submit" && !txt) {
    attributesToTranslate.push({
        node: e,
        original: "Submit Query",
        attrName: "value",
    });
    } else if (e.type == "reset" && !txt) {
    attributesToTranslate.push({
        node: e,
        original: "Reset",
        attrName: "value",
    });
    } else if (txt && txt.trim()) {
    attributesToTranslate.push({
        node: e,
        original: txt,
        attrName: "value",
    });
    }
});

titleElements.forEach((e) => {
    if (hasNoTranslate(e)) return;

    const txt = e.getAttribute("title");
    if (txt && txt.trim()) {
    attributesToTranslate.push({
        node: e,
        original: txt,
        attrName: "title",
    });
    }
});

return attributesToTranslate;
}

// encapsular o texto faz com que do video suma
// ao utilizar função como Pai.removeChild(filho)
// pode ser gerado um erro ao encapsular
function encapsulateTextNode(node) {
const fontNode = document.createElement("font");
fontNode.setAttribute("style", "vertical-align: inherit;");
fontNode.textContent = node.textContent;

node.replaceWith(fontNode);

return fontNode;
}

function translateTextContent(node, parentNode, text, toRestore) {
toRestore.translatedText = text;

if (location.hostname === "pdf.translatewebpages.org") {
    if (
    parentNode &&
    parentNode.nodeName.toLowerCase() === "span" &&
    parentNode.getAttribute("role") === "presentation"
    ) {
    const oldClientWidth = node.parentNode.clientWidth;
    node.textContent = text;
    const newClientWidth = node.parentNode.clientWidth;
    const transformMatch = parentNode.style.transform.match(
        /[0-9]+[\.]{1,1}[0-9]*/
    );
    const currentScaleX = transformMatch
        ? parseFloat(transformMatch[0])
        : 1.0;
    toRestore.originalScale = currentScaleX;
    parentNode.style.transform = `scaleX(${
        currentScaleX *
        Math.min(currentScaleX, oldClientWidth / newClientWidth)
    })`;
    } else {
    node.textContent = text;
    }
} else {
    node.textContent = text;
}
}

function translateResults(piecesToTranslateNow, results) {
    if (dontSortResults) {
      for (let i = 0; i < results.length; i++) {
        for (let j = 0; j < results[i].length; j++) {
          if (piecesToTranslateNow[i].nodes[j]) {
            const nodes = piecesToTranslateNow[i].nodes;
            let translated = results[i][j] + " ";
            // In some case, results items count is over original node count
            // Rest results append to last node
            if (
              piecesToTranslateNow[i].nodes.length - 1 === j &&
              results[i].length > j
            ) {
              const restResults = results[i].slice(j + 1);
              translated += restResults.join(" ");
            }

            const originalTextNode = nodes[j];
            const parentNode = nodes[j].parentNode;
            // if (showOriginal.isEnabled) {
            //   nodes[j] = encapsulateTextNode(nodes[j]);
            //   showOriginal.add(nodes[j]);
            // }

            const toRestore = {
              node: nodes[j],
              original: originalTextNode,
              originalText: originalTextNode.textContent,
              translatedText: translated,
              originalScale: null,
              parentNode,
            };
            nodesToRestore.push(toRestore);

            const originalText = originalTextNode.textContent;
            handleCustomWords(
              translated,
              nodes[j].textContent,
              customDictionary,
              currentPageTranslatorService,
              currentSourceLanguage,
              currentTargetLanguage
            ).then((results) => {
              // results = `${originalText.match(/^\s*/)[0]}${results.trim()}${
              //   originalText.match(/\s*$/)[0]
              // }`;
              translateTextContent(nodes[j], parentNode, results, toRestore);
            });
          }
        }
      }
    } else {
      for (const i in piecesToTranslateNow) {
        for (const j in piecesToTranslateNow[i].nodes) {
          if (results[i][j]) {
            const nodes = piecesToTranslateNow[i].nodes;
            const translated = results[i][j] + " ";

            const originalTextNode = nodes[j];
            const parentNode = nodes[j].parentNode;
            // if (showOriginal.isEnabled) {
            //   nodes[j] = encapsulateTextNode(nodes[j]);
            //   showOriginal.add(nodes[j]);
            // }

            const toRestore = {
              node: nodes[j],
              original: originalTextNode,
              originalText: originalTextNode.textContent,
              translatedText: translated,
              parentNode,
            };
            nodesToRestore.push(toRestore);

            const originalText = originalTextNode.textContent;
            handleCustomWords(
              translated,
              nodes[j].textContent,
              customDictionary,
              currentPageTranslatorService,
              currentSourceLanguage,
              currentTargetLanguage
            ).then((results) => {
              // results = `${originalText.match(/^\s*/)[0]}${results.trim()}${
              //   originalText.match(/\s*$/)[0]
              // }`;
              translateTextContent(nodes[j], parentNode, results, toRestore);
            });
          }
        }
      }
    }

    mutationObserver.takeRecords();
}

function isNoTranslateNode(node) {
    const nodeName = node.nodeName.toLowerCase();
    const index = htmlTagsNoTranslate.indexOf(nodeName);
    if (index === -1) {
      return false;
    } else {
      // https://github.com/FilipePS/Traduzir-paginas-web/issues/654
      if (
        nodeName === "script" &&
        node.getAttribute("data-spotim-module") === "spotim-launcher" &&
        [...node.childNodes].find((node) => node.nodeType === 1)
      ) {
        return false;
      } else {
        return true;
      }
    }
}

function translateAttributes(attributesToTranslateNow, results) {
    for (const i in attributesToTranslateNow) {
        const ati = attributesToTranslateNow[i];
        ati.node.setAttribute(ati.attrName, results[i]);
    }
}


function translationRoutine() {
    try {
      if (piecesToTranslate && pageIsVisible) {
        (function () {
          const innerHeight = window.innerHeight;

          function isInScreen(element) {
            const rect = element.getBoundingClientRect();
            if (
              (rect.top > 0 && rect.top <= innerHeight) ||
              (rect.bottom > 0 && rect.bottom <= innerHeight)
            ) {
              return true;
            }
            return false;
          }

          function topIsInScreen(element) {
            if (!element) {
              // debugger;
              return false;
            }
            const rect = element.getBoundingClientRect();
            if (rect.top > 0 && rect.top <= innerHeight) {
              return true;
            }
            return false;
          }

          function bottomIsInScreen(element) {
            if (!element) {
              // debugger;
              return false;
            }
            const rect = element.getBoundingClientRect();
            if (rect.bottom > 0 && rect.bottom <= innerHeight) {
              return true;
            }
            return false;
          }

          const currentFooCount = fooCount;

          const piecesToTranslateNow = [];
          piecesToTranslate.forEach((ptt) => {
            if (!ptt.isTranslated) {
              if (
                bottomIsInScreen(ptt.topElement) ||
                topIsInScreen(ptt.bottomElement)
              ) {
                ptt.isTranslated = true;
                piecesToTranslateNow.push(ptt);
              }
            }
          });

          const attributesToTranslateNow = [];
          attributesToTranslate.forEach((ati) => {
            if (!ati.isTranslated) {
              if (isInScreen(ati.node)) {
                ati.isTranslated = true;
                attributesToTranslateNow.push(ati);
              }
            }
          });

          if (piecesToTranslateNow.length > 0) {
            backgroundTranslateHTML(
              currentPageTranslatorService,
              currentSourceLanguage,
              currentTargetLanguage,
              piecesToTranslateNow.map((ptt) =>
                ptt.nodes.map((node) =>
                  filterKeywordsInText(
                    node.textContent,
                    customDictionary,
                    currentPageTranslatorService
                  )
                )
              ),
              dontSortResults
            ).then((results) => {
              if (
                pageLanguageState === "translated" &&
                currentFooCount === fooCount
              ) {
                translateResults(piecesToTranslateNow, results);
              }
            });
          }

          if (attributesToTranslateNow.length > 0) {
            backgroundTranslateText(
              currentPageTranslatorService,
              currentSourceLanguage,
              currentTargetLanguage,
              attributesToTranslateNow.map((ati) => ati.original)
            ).then((results) => {
              if (
                pageLanguageState === "translated" &&
                currentFooCount === fooCount
              ) {
                translateAttributes(attributesToTranslateNow, results);
              }
            });
          }
        })();
      }
    } catch (e) {
      console.error(e);
    }

    clearTimeout(translationRoutine_handler);
    translationRoutine_handler = setTimeout(translationRoutine, 300);
}

function backgroundTranslateHTML(
    translationService,
    sourceLanguage,
    targetLanguage,
    sourceArray2d,
    dontSortResults
  ) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          action: "translateHTML",
          translationService,
          sourceLanguage,
          targetLanguage,
          sourceArray2d,
          dontSortResults,
        },
        (response) => {
          //checkedLastError();
          resolve(response);
        }
      );
    });
}
function backgroundTranslateText(
    translationService,
    sourceLanguage,
    targetLanguage,
    sourceArray
  ) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          action: "translateText",
          translationService,
          sourceLanguage,
          targetLanguage,
          sourceArray,
        },
        (response) => {
          //checkedLastError();
          resolve(response);
        }
      );
    });
}

function backgroundTranslateSingleText(
translationService,
sourceLanguage,
targetLanguage,
source
) {
return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
    {
        action: "translateSingleText",
        translationService,
        sourceLanguage,
        targetLanguage,
        source,
    },
    (response) => {
        //checkedLastError();
        resolve(response);
    }
    );
});
}
function filterKeywordsInText(
    textContext,
    sortedCustomDictionary,
    currentPageTranslatorService
  ) {
    if (sortedCustomDictionary.size > 0) {
      for (let keyWord of sortedCustomDictionary.keys()) {
        while (true) {
          let index = textContext.toLowerCase().indexOf(keyWord);
          if (index === -1) {
            break;
          } else {
            textContext = removeExtraDelimiter(textContext);
            let previousIndex = index - 1;
            let nextIndex = index + keyWord.length;
            let previousChar =
              previousIndex === -1 ? "\n" : textContext.charAt(previousIndex);
            let nextChar =
              nextIndex === textContext.length
                ? "\n"
                : textContext.charAt(nextIndex);
            let placeholderText = "";
            let keyWordWithCase = textContext.substring(
              index,
              index + keyWord.length
            );
            if (
              isPunctuationOrDelimiter(previousChar) &&
              isPunctuationOrDelimiter(nextChar)
            ) {
              /**
               * Bing's translation engine, officially provides custom dictionary function,
               * so it has its own separate tags.
               * At the same time we add a space before and after the word to make it look a little more comfortable.
               * */
              if (currentPageTranslatorService === "bing") {
                let customValue = sortedCustomDictionary.get(keyWord);
                if (customValue === "") customValue = keyWordWithCase;
                customValue =
                  " " +
                  customValue.substring(0, 1) +
                  "#n%o#" +
                  customValue.substring(1) +
                  " ";
                placeholderText =
                  bingMarkFrontPart + customValue + bingMarkSecondPart;
              } else {
                placeholderText =
                  startMark + handleHitKeywords(keyWordWithCase, true) + endMark;
              }
            } else {
              placeholderText = "#n%o#";
              for (let c of Array.from(keyWordWithCase)) {
                placeholderText += c;
                placeholderText += "#n%o#";
              }
            }
            let frontPart = textContext.substring(0, index);
            let backPart = textContext.substring(index + keyWord.length);
            textContext = frontPart + placeholderText + backPart;
          }
        }
        textContext = textContext.replaceAll("#n%o#", "");
      }
    }
    return textContext;
}

async function handleCustomWords(translated, originalText, customDictionary, currentPageTranslatorService, currentSourceLanguage, currentTargetLanguage) {
  try {
    if (customDictionary.size > 0 && currentPageTranslatorService !== "bing") {
      // If the translation is a single word and exists in the dictionary, return it directly
      let customValue = customDictionary.get(originalText.trim());
      if (customValue) return customValue;
      translated = removeExtraDelimiter(translated);
      translated = translated.replaceAll(startMark0, startMark);
      translated = translated.replaceAll(endMark0, endMark);
      while (true) {
        let startIndex = translated.indexOf(startMark);
        let endIndex = translated.indexOf(endMark);
        if (startIndex === -1 && endIndex === -1) {
          break;
        } else {
          let placeholderText = translated.substring(startIndex + startMark.length, endIndex);
          // At this point placeholderText is actually currentIndex , the real value is in compressionMap
          let keyWord = handleHitKeywords(placeholderText, false);
          if (keyWord === "undefined") {
            throw new Error("undefined");
          }
          let frontPart = translated.substring(0, startIndex);
          let backPart = translated.substring(endIndex + endMark.length);
          let customValue = customDictionary.get(keyWord.toLowerCase());
          customValue = customValue === "" ? keyWord : customValue;
          // Highlight custom words, make it have a space before and after it
          frontPart = isPunctuationOrDelimiter(frontPart.charAt(frontPart.length - 1)) ? frontPart : frontPart + " ";
          backPart = isPunctuationOrDelimiter(backPart.charAt(0)) ? backPart : " " + backPart;
          translated = frontPart + customValue + backPart;
        }
      }
    }
  } catch (e) {
    return await backgroundTranslateSingleText(currentPageTranslatorService, currentSourceLanguage, currentTargetLanguage, originalText);
  }
  return translated;
}

const mutationObserver = new MutationObserver(function (mutations) {
    const piecesToTranslate = [];

    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((addedNode) => {
        const nodeName = addedNode.nodeName.toLowerCase();
        if (!isNoTranslateNode(addedNode)) {
          if (htmlTagsInlineText.indexOf(nodeName) == -1) {
            if (htmlTagsInlineIgnore.indexOf(nodeName) == -1) {
              piecesToTranslate.push(addedNode);
            }
          }
        }
      });

      mutation.removedNodes.forEach((removedNode) => {
        removedNodes.push(removedNode);
      });
    });

    piecesToTranslate.forEach((ptt) => {
      if (newNodes.indexOf(ptt) == -1) {
        newNodes.push(ptt);
      }
    });
});

