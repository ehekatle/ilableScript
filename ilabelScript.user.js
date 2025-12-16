// ==UserScript==
// @name         iLabel直播审核辅助
// @namespace    https://github.com/ehekatle/ilableScript
// @version      2.1
// @description  预埋、豁免、直播信息违规、超时提示功能，最终版
// @author       ehekatle
// @source       https://github.com/ehekatle/ilableScript
// @updateURL    https://gh-proxy.org/https://github.com/ehekatle/ilableScript/raw/refs/heads/main/ilabelScript.meta.js
// @downloadURL  https://gh-proxy.org/https://github.com/ehekatle/ilableScript/raw/refs/heads/main/ilabelScript.user.js
// @match        https://ilabel.weixin.qq.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=weixin.qq.com
// @grant        GM_xmlhttpRequest
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';
    
    // 远程库URL
    const REMOTE_SCRIPT_URL = 'https://gh-proxy.org/https://github.com/ehekatle/ilableScript/raw/refs/heads/test/ilableScript.js';
    
    // ==================== 推送功能（使用GM_xmlhttpRequest） ====================
    
    // 企业微信推送函数 - 使用GM_xmlhttpRequest
    function sendWeChatPush(message, mentionedList = []) {
        console.log('iLabel: 准备发送企业微信推送:', { message, mentionedList });
        
        let finalMessage = message;
        if (mentionedList && mentionedList.length > 0) {
            finalMessage = message + mentionedList.map(name => ` @${name}`).join('');
        }
        
        const payload = {
            msgtype: "text",
            text: {
                content: finalMessage
            }
        };
        
        // 使用GM_xmlhttpRequest发送请求
        GM_xmlhttpRequest({
            method: "POST",
            url: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=90014c35-804f-489e-b203-bf59f46f69fb",
            headers: {
                "Content-Type": "application/json"
            },
            data: JSON.stringify(payload),
            onload: function(response) {
                if (response.status === 200) {
                    console.log('iLabel: 企业微信推送成功');
                } else {
                    console.error('iLabel: 企业微信推送失败，状态码:', response.status, '响应:', response.responseText);
                }
            },
            onerror: function(error) {
                console.error('iLabel: 企业微信推送网络错误:', error);
            }
        });
    }
    
    // ==================== 远程库加载 ====================
    
    function loadRemoteScript() {
        console.log('iLabel: 开始加载远程库...');
        
        GM_xmlhttpRequest({
            method: 'GET',
            url: REMOTE_SCRIPT_URL + '?t=' + Date.now(),
            onload: function(response) {
                if (response.status === 200) {
                    try {
                        // 在注入远程库之前，设置推送函数
                        const originalSendWeChatPush = sendWeChatPush.toString();
                        
                        // 修改远程库代码，替换推送函数
                        let scriptContent = response.responseText;
                        
                        // 替换推送函数，使其调用用户脚本的推送函数
                        scriptContent = scriptContent.replace(
                            /function sendWeChatPush\(message, mentionedList = \[\]\) \{[\s\S]*?\}/,
                            `function sendWeChatPush(message, mentionedList = []) {
                                console.log('远程库调用推送:', message, mentionedList);
                                // 调用用户脚本的推送函数
                                if (window._ilabelSendPush) {
                                    window._ilabelSendPush(message, mentionedList);
                                } else {
                                    console.error('推送函数未初始化');
                                }
                            }`
                        );
                        
                        // 注入修改后的脚本
                        const script = document.createElement('script');
                        script.textContent = scriptContent;
                        script.type = 'text/javascript';
                        document.head.appendChild(script);
                        script.remove();
                        
                        console.log('iLabel: 远程库加载成功');
                    } catch (e) {
                        console.error('iLabel: 远程库处理失败:', e);
                    }
                } else {
                    console.error('iLabel: 远程库加载失败，状态码:', response.status);
                }
            },
            onerror: function(error) {
                console.error('iLabel: 远程库加载网络错误:', error);
            }
        });
    }
    
    // ==================== 初始化 ====================
    
    // 在页面中暴露推送函数
    window._ilabelSendPush = sendWeChatPush;
    
    // 立即加载远程库
    loadRemoteScript();
})();
