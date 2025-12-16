// ==UserScript==
// @name         iLabel远程库测试脚本
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  完全模拟用户脚本调用远程库进行测试
// @author       caloneis
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';
    
    console.log('iLabel远程库测试脚本开始执行');
    
    // ==================== 远程库URL ====================
    const REMOTE_SCRIPT_URL = 'https://gh-proxy.org/https://github.com/ehekatle/ilableScript/blob/test/ilableScript.js';
    
    // ==================== 模拟环境变量 ====================
    
    // 模拟localStorage（用于存储开关状态）
    window.localStorage = window.localStorage || {
        _data: {},
        setItem: function(key, value) {
            this._data[key] = value;
            console.log(`模拟localStorage.setItem: ${key}=${value}`);
        },
        getItem: function(key) {
            const value = this._data[key];
            console.log(`模拟localStorage.getItem: ${key}=${value}`);
            return value;
        },
        removeItem: function(key) {
            delete this._data[key];
            console.log(`模拟localStorage.removeItem: ${key}`);
        }
    };
    
    // 设置初始开关状态为开启
    localStorage.setItem('ilabel_reminder_enabled', 'true');
    
    // ==================== 推送函数（模拟用户脚本的推送） ====================
    
    function sendWeChatPush(message, mentionedList = []) {
        console.log('测试脚本推送函数被调用:', { message, mentionedList });
        
        let finalMessage = message;
        if (mentionedList && mentionedList.length > 0) {
            finalMessage = message + mentionedList.map(name => ` @${name}`).join('');
        }
        
        console.log('-----------------------------------------');
        console.log('✅ 测试推送成功！');
        console.log('推送消息:', finalMessage);
        console.log('推送URL: https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=90014c35-804f-489e-b203-bf59f46f69fb');
        console.log('-----------------------------------------');
        
        // 显示推送成功提示
        showPushSuccess(finalMessage);
        
        return true;
    }
    
    // ==================== 成功提示 ====================
    
    function showPushSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #52c41a;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000001;
            font-family: 'Microsoft YaHei', sans-serif;
            max-width: 400px;
            animation: slideIn 0.3s ease;
        `;
        
        successDiv.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">✅ 测试推送成功</div>
            <div style="font-size: 12px; opacity: 0.9;">${message}</div>
        `;
        
        document.body.appendChild(successDiv);
        
        // 3秒后移除
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    if (successDiv.parentNode) {
                        successDiv.parentNode.removeChild(successDiv);
                    }
                }, 300);
            }
        }, 3000);
    }
    
    // ==================== 模拟iLabel API响应 ====================
    
    // 模拟XMLHttpRequest拦截
    function mockXHRInterceptor() {
        const OriginalXHR = window.XMLHttpRequest;
        
        window.XMLHttpRequest = function() {
            const xhr = new OriginalXHR();
            const originalOpen = xhr.open;
            const originalSend = xhr.send;
            
            xhr.open = function(method, url) {
                this._requestURL = url;
                this._method = method;
                return originalOpen.apply(this, arguments);
            };
            
            xhr.send = function(data) {
                // 模拟iLabel的get_live_info_batch响应
                if (this._requestURL && this._requestURL.includes('get_live_info_batch')) {
                    console.log('模拟XHR请求:', this._requestURL);
                    
                    // 模拟服务器响应
                    setTimeout(() => {
                        const mockResponse = {
                            ret: 0,
                            liveInfoList: [{
                                liveId: 'test_live_123456',
                                description: '测试直播间 - 珠宝首饰展示',
                                nickname: '测试主播',
                                signature: '测试签名',
                                authStatus: '个人认证',
                                extraField: {
                                    createLiveArea: '北京'
                                },
                                poiName: '北京市',
                                streamStartTime: Math.floor(Date.now() / 1000).toString()
                            }]
                        };
                        
                        // 触发远程库的响应处理
                        xhr.readyState = 4;
                        xhr.status = 200;
                        xhr.responseText = JSON.stringify(mockResponse);
                        
                        if (xhr.onreadystatechange) {
                            xhr.onreadystatechange.call(xhr);
                        }
                        
                        if (xhr.onload) {
                            xhr.onload.call(xhr);
                        }
                    }, 100);
                    
                    return;
                }
                
                // 其他请求正常发送
                return originalSend.call(this, data);
            };
            
            return xhr;
        };
        
        // 保持原型链
        window.XMLHttpRequest.prototype = OriginalXHR.prototype;
    }
    
    // ==================== 模拟fetch请求 ====================
    
    function mockFetch() {
        const originalFetch = window.fetch;
        
        window.fetch = function(url, options) {
            // 模拟获取审核人员信息
            if (url && url.includes('api/user/info')) {
                console.log('模拟fetch请求: 获取审核人员信息');
                
                return Promise.resolve({
                    ok: true,
                    json: function() {
                        return Promise.resolve({
                            status: 'ok',
                            data: {
                                name: '工号-王鹏程'
                            }
                        });
                    }
                });
            }
            
            // 其他请求正常处理
            return originalFetch.apply(this, arguments);
        };
    }
    
    // ==================== 加载远程库 ====================
    
    function loadRemoteScript() {
        console.log('测试脚本: 开始加载远程库...');
        
        GM_xmlhttpRequest({
            method: 'GET',
            url: REMOTE_SCRIPT_URL + '?t=' + Date.now(),
            onload: function(response) {
                if (response.status === 200) {
                    try {
                        // 在注入远程库之前，设置模拟环境
                        window._ilabelSendPush = sendWeChatPush;
                        
                        // 注入远程库代码
                        const script = document.createElement('script');
                        script.textContent = response.responseText;
                        script.type = 'text/javascript';
                        document.head.appendChild(script);
                        script.remove();
                        
                        console.log('测试脚本: 远程库加载成功');
                        
                        // 等待远程库初始化完成后，触发测试
                        setTimeout(runTest, 1000);
                        
                    } catch (e) {
                        console.error('测试脚本: 远程库处理失败:', e);
                    }
                } else {
                    console.error('测试脚本: 远程库加载失败，状态码:', response.status);
                    // 使用备用本地测试
                    loadBackupScript();
                }
            },
            onerror: function(error) {
                console.error('测试脚本: 远程库加载网络错误:', error);
                loadBackupScript();
            }
        });
    }
    
    // ==================== 备用脚本（如果远程库加载失败） ====================
    
    function loadBackupScript() {
        console.log('测试脚本: 使用备用脚本...');
        
        // 这里可以放置一个简化的远程库版本用于测试
        // 由于代码较长，这里只显示提示
        const backupScript = `
            console.log('备用远程库加载');
            alert('远程库加载失败，请检查网络连接');
        `;
        
        const script = document.createElement('script');
        script.textContent = backupScript;
        script.type = 'text/javascript';
        document.head.appendChild(script);
        script.remove();
    }
    
    // ==================== 运行测试 ====================
    
    function runTest() {
        console.log('测试脚本: 开始运行测试...');
        
        // 检查远程库是否初始化完成
        if (!window.getReminderStatus || typeof window.getReminderStatus !== 'function') {
            console.log('测试脚本: 远程库未完全初始化，等待...');
            setTimeout(runTest, 500);
            return;
        }
        
        // 检查开关状态
        const isEnabled = window.getReminderStatus();
        console.log('测试脚本: 开关状态:', isEnabled ? '开启' : '关闭');
        
        // 模拟XMLHttpRequest请求，触发远程库的弹窗
        triggerMockRequest();
    }
    
    // ==================== 触发模拟请求 ====================
    
    function triggerMockRequest() {
        console.log('测试脚本: 触发模拟API请求...');
        
        // 创建一个模拟的XMLHttpRequest请求
        const xhr = new XMLHttpRequest();
        xhr.open('GET', 'https://ilabel.weixin.qq.com/api/get_live_info_batch?test=1');
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4 && xhr.status === 200) {
                console.log('测试脚本: 模拟请求完成');
            }
        };
        xhr.send();
        
        // 显示测试说明
        showTestInstructions();
    }
    
    // ==================== 显示测试说明 ====================
    
    function showTestInstructions() {
        const instructions = document.createElement('div');
        instructions.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000000;
            font-family: 'Microsoft YaHei', sans-serif;
            max-width: 500px;
            border-left: 4px solid #1890ff;
            animation: fadeIn 0.5s ease;
        `;
        
        instructions.innerHTML = `
            <div style="font-weight: bold; color: #1890ff; margin-bottom: 10px;">
                🧪 iLabel远程库测试
            </div>
            <div style="font-size: 13px; color: #666; line-height: 1.5; margin-bottom: 10px;">
                1. 已成功加载远程库<br>
                2. 审核人员设置为: <strong>王鹏程</strong><br>
                3. 开关状态: <strong>已开启</strong><br>
                4. 弹窗将在20秒后自动推送<br>
                5. 您也可以点击弹窗中的"确认并关闭"按钮
            </div>
            <div style="font-size: 12px; color: #999;">
                测试完成后，请刷新页面停止测试
            </div>
        `;
        
        document.body.appendChild(instructions);
        
        // 添加动画样式
        GM_addStyle(`
            @keyframes fadeIn {
                from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
            
            @keyframes slideIn {
                from { opacity: 0; transform: translateX(20px); }
                to { opacity: 1; transform: translateX(0); }
            }
            
            @keyframes slideOut {
                from { opacity: 1; transform: translateX(0); }
                to { opacity: 0; transform: translateX(20px); }
            }
        `);
    }
    
    // ==================== 初始化 ====================
    
    function init() {
        console.log('测试脚本: 初始化...');
        
        // 模拟XMLHttpRequest拦截
        mockXHRInterceptor();
        
        // 模拟fetch请求
        mockFetch();
        
        // 加载远程库
        loadRemoteScript();
        
        console.log('测试脚本: 初始化完成');
    }
    
    // ==================== 立即开始初始化 ====================
    
    // 等待页面基本就绪
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 100);
    }
})();
