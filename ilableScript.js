// ==================== 配置部分 ====================
// 主播白名单（空格分隔）
const CONFIG = {
  ANCHOR_WHITELIST: "百年对语 东南军迷俱乐部 广东新闻广描 广东新闻频道 广东移动频道 湖南国际瑰宝雅集 湖南国际频道文创甄选 湖南国际珍宝收藏 琳琅瑰宝雅集 央博匠心 雨家饰品 雨家首饰 豫见新财富 BRTV大家收藏 BRTV首都经济报道 好物珍宝 央博典藏 央博非遗珍宝 央博好物 央博木作 央博器",
  
  // 处罚检查关键词（空格分隔）
  PUNISHMENT_KEYWORDS: "金包 金重量 金含量 金镯子 金项链 金子这么便宜 缅 曼德勒 越南",
  
  // 审核白名单（空格分隔）
  REVIEWER_WHITELIST: "王鹏程 刘丹娜 蒋娜娜 刘维青 李晓露 何浩 卢洪",
  
  // 审核黑名单（空格分隔）
  REVIEWER_BLACKLIST: "杨松江",
  
  // 推送地址
  PUSH_URL: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=90014c35-804f-489e-b203-bf59f46f69fb"
};

// 将配置转换为数组
const ANCHOR_WHITELIST_ARRAY = CONFIG.ANCHOR_WHITELIST.split(' ').filter(item => item.trim());
const PUNISHMENT_KEYWORDS_ARRAY = CONFIG.PUNISHMENT_KEYWORDS.split(' ').filter(item => item.trim());
const REVIEWER_WHITELIST_ARRAY = CONFIG.REVIEWER_WHITELIST.split(' ').filter(item => item.trim());
const REVIEWER_BLACKLIST_ARRAY = CONFIG.REVIEWER_BLACKLIST.split(' ').filter(item => item.trim());

console.log('iLabel远程脚本开始执行');

// ==================== 全局变量 ====================
let currentLiveInfo = null;
let currentReviewer = null;
let popupTimer = null;
let popupStartTime = null;
let isInitialized = false;
let xhrInterceptorBound = false;

// ==================== 样式定义 ====================
const STYLES = `
    .ilabel-custom-notification {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1000000;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        min-width: 500px;
        max-width: 600px;
        font-family: 'Microsoft YaHei', sans-serif;
        overflow: hidden;
        animation: popupFadeIn 0.3s ease;
    }
    
    @keyframes popupFadeIn {
        from {
            opacity: 0;
            transform: translate(-50%, -60%);
        }
        to {
            opacity: 1;
            transform: translate(-50%, -50%);
        }
    }
    
    .ilabel-notification-header {
        padding: 16px 20px;
        font-weight: bold;
        font-size: 18px;
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid rgba(255,255,255,0.2);
    }
    
    .ilabel-header-normal {
        background: #1890ff;
    }
    
    .ilabel-header-green {
        background: #52c41a;
    }
    
    .ilabel-header-yellow {
        background: #faad14;
    }
    
    .ilabel-header-red {
        background: #f5222d;
    }
    
    .ilabel-notification-close {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background 0.2s;
    }
    
    .ilabel-notification-close:hover {
        background: rgba(255,255,255,0.2);
    }
    
    .ilabel-notification-content {
        padding: 20px;
        max-height: 500px;
        overflow-y: auto;
    }
    
    .ilabel-info-row {
        display: flex;
        margin-bottom: 10px;
        line-height: 1.5;
        min-height: 24px;
    }
    
    .ilabel-info-label {
        width: 100px;
        color: #666;
        font-weight: 500;
        flex-shrink: 0;
    }
    
    .ilabel-info-value {
        flex: 1;
        color: #333;
        word-break: break-all;
        line-height: 24px;
    }
    
    .ilabel-copy-btn {
        background: #1890ff;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 2px 10px;
        font-size: 12px;
        cursor: pointer;
        margin-left: 8px;
        transition: background 0.2s;
        height: 24px;
        line-height: 20px;
    }
    
    .ilabel-copy-btn:hover {
        background: #40a9ff;
    }
    
    .ilabel-copy-btn:active {
        background: #096dd9;
    }
    
    .ilabel-copied {
        background: #52c41a !important;
    }
    
    .ilabel-result-box {
        margin-top: 20px;
        padding: 15px;
        border-radius: 6px;
        font-weight: bold;
        text-align: center;
        font-size: 16px;
        border-left: 5px solid;
    }
    
    .ilabel-result-normal {
        background: #e6f7ff;
        color: #1890ff;
        border-color: #91d5ff;
    }
    
    .ilabel-result-green {
        background: #f6ffed;
        color: #52c41a;
        border-color: #b7eb8f;
    }
    
    .ilabel-result-yellow {
        background: #fffbe6;
        color: #faad14;
        border-color: #ffe58f;
    }
    
    .ilabel-result-red {
        background: #fff1f0;
        color: #f5222d;
        border-color: #ffa39e;
    }
    
    .ilabel-notification-footer {
        padding: 15px 20px;
        border-top: 1px solid #f0f0f0;
        display: flex;
        justify-content: center;
        background: #fafafa;
    }
    
    .ilabel-confirm-btn {
        background: #1890ff;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 10px 30px;
        font-size: 15px;
        cursor: pointer;
        transition: background 0.2s;
        font-weight: bold;
    }
    
    .ilabel-confirm-btn:hover {
        background: #40a9ff;
    }
    
    .ilabel-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.5);
        z-index: 999999;
    }
    
    .ilabel-liveid-value {
        background-color: #f5f5f5;
        padding: 4px 10px;
        border-radius: 4px;
        font-family: 'Courier New', monospace;
        cursor: pointer;
        border: 1px solid #ddd;
        font-size: 14px;
        word-break: break-all;
        display: inline-block;
        max-width: 300px;
    }
    
    .ilabel-liveid-value:hover {
        background-color: #e8e8e8;
    }
`;

// ==================== 工具函数 ====================

// 添加样式到页面
function addStyles() {
    if (!document.querySelector('#ilabel-styles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'ilabel-styles';
        styleEl.textContent = STYLES;
        document.head.appendChild(styleEl);
        console.log('弹窗样式已添加到页面');
    }
}

// 获取网络北京时间
function getBeijingTime() {
    const now = new Date();
    const beijingOffset = 8 * 60;
    const localOffset = now.getTimezoneOffset();
    const beijingTime = new Date(now.getTime() + (beijingOffset + localOffset) * 60 * 1000);
    return beijingTime;
}

// 格式化时间戳
function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

// 检查是否是同一天
function isSameDay(timestamp1, timestamp2) {
    const date1 = new Date(timestamp1 * 1000);
    const date2 = new Date(timestamp2 * 1000);
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

// 复制文本到剪贴板
function copyToClipboard(text) {
    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        
        if (success) {
            console.log('复制成功:', text);
            return true;
        }
    } catch (err) {
        console.error('复制失败:', err);
    }
    return false;
}

// 解码Unicode字符串（参考旧版）
function decodeUnicode(str) {
    if (!str) return '';
    return str.replace(/\\u([\d\w]{4})/gi, function(match, grp) {
        return String.fromCharCode(parseInt(grp, 16));
    });
}

// 发送企业微信推送
async function sendWeChatPush(message, mentionedList = []) {
    console.log('尝试发送企业微信推送:', { message, mentionedList });
    
    try {
        const payload = {
            msgtype: "text",
            text: {
                content: message,
                mentioned_list: mentionedList
            }
        };
        
        const response = await fetch(CONFIG.PUSH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            console.log('推送发送成功');
        } else {
            console.error('推送发送失败，状态码:', response.status);
        }
    } catch (error) {
        console.error('推送发送失败:', error);
    }
}

// ==================== 信息获取部分 ====================

// 获取审核人员信息
async function getReviewerInfo() {
    console.log('开始获取审核人员信息...');
    try {
        const response = await fetch('https://ilabel.weixin.qq.com/api/user/info', {
            method: 'GET',
            headers: {
                'accept': 'application/json, text/plain, */*',
                'x-requested-with': 'XMLHttpRequest'
            },
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.status === 'ok' && data.data && data.data.name) {
                const fullName = data.data.name;
                console.log('获取到审核人员全名:', fullName);
                
                const dashIndex = fullName.indexOf('-');
                if (dashIndex !== -1) {
                    const reviewerName = fullName.substring(dashIndex + 1).trim();
                    console.log('提取审核人员名称:', reviewerName);
                    return reviewerName;
                }
                return fullName.trim();
            }
        }
    } catch (error) {
        console.error('获取审核人员信息失败:', error);
    }
    return null;
}

// 解析直播信息
function parseLiveInfo(responseData) {
    if (!responseData || responseData.ret !== 0 || !responseData.liveInfoList || responseData.liveInfoList.length === 0) {
        return null;
    }
    
    const liveInfo = responseData.liveInfoList[0];
    console.log('解析直播信息:', liveInfo);
    
    return {
        liveId: liveInfo.liveId || '',
        description: decodeUnicode(liveInfo.description || ''),
        nickname: decodeUnicode(liveInfo.nickname || ''),
        signature: decodeUnicode(liveInfo.signature || ''),
        authStatus: decodeUnicode(liveInfo.authStatus || ''),
        createLiveArea: liveInfo.extraField?.createLiveArea || '',
        poiName: decodeUnicode(liveInfo.poiName || ''),
        streamStartTime: liveInfo.streamStartTime ? parseInt(liveInfo.streamStartTime) : null
    };
}

// ==================== 信息检查部分 ====================

function checkInfo(liveInfo, reviewer) {
    console.log('开始检查直播信息...');
    
    // 1. 审核人员检查
    if (reviewer && REVIEWER_BLACKLIST_ARRAY.includes(reviewer)) {
        console.log('审核人员在黑名单中:', reviewer);
        return {
            type: 'blacklist',
            message: '审核人员在黑名单中',
            color: 'red',
            headerClass: 'ilabel-header-red',
            resultClass: 'ilabel-result-red'
        };
    }
    
    // 2. 质检单检查
    if (liveInfo.streamStartTime) {
        const beijingTime = getBeijingTime();
        const currentTimestamp = Math.floor(beijingTime.getTime() / 1000);
        
        console.log('时间检查:', {
            开始时间: formatTimestamp(liveInfo.streamStartTime),
            当前时间: formatTimestamp(currentTimestamp),
            是否同一天: isSameDay(liveInfo.streamStartTime, currentTimestamp)
        });
        
        if (!isSameDay(liveInfo.streamStartTime, currentTimestamp)) {
            console.log('检测到质检单（非今天）');
            return {
                type: 'quality',
                message: '该直播为质检单',
                color: 'red',
                headerClass: 'ilabel-header-red',
                resultClass: 'ilabel-result-red'
            };
        }
        console.log('直播是今天的（非质检单）');
    }
    
    // 3. 豁免检查
    console.log('检查主播昵称:', liveInfo.nickname);
    console.log('检查主播认证:', liveInfo.authStatus);
    
    if (ANCHOR_WHITELIST_ARRAY.includes(liveInfo.nickname)) {
        console.log('主播在白名单中:', liveInfo.nickname);
        return {
            type: 'whitelist',
            message: '该主播为白名单或事业单位',
            color: 'green',
            headerClass: 'ilabel-header-green',
            resultClass: 'ilabel-result-green'
        };
    }
    
    if (liveInfo.authStatus && liveInfo.authStatus.includes('事业单位')) {
        console.log('主播认证包含事业单位:', liveInfo.authStatus);
        return {
            type: 'whitelist',
            message: '该主播为白名单或事业单位',
            color: 'green',
            headerClass: 'ilabel-header-green',
            resultClass: 'ilabel-result-green'
        };
    }
    
    // 4. 处罚检查
    console.log('开始处罚关键词检查...');
    const checkFields = [
        { field: liveInfo.description, name: '直播间描述' },
        { field: liveInfo.nickname, name: '主播昵称' },
        { field: liveInfo.poiName, name: '开播位置' }
    ];
    
    for (const check of checkFields) {
        if (check.field) {
            for (const keyword of PUNISHMENT_KEYWORDS_ARRAY) {
                if (check.field.includes(keyword)) {
                    console.log(`命中处罚关键词: ${check.name} 包含 "${keyword}"`);
                    return {
                        type: 'punishment',
                        message: `${check.name}命中处罚关键词：${keyword}`,
                        color: 'yellow',
                        headerClass: 'ilabel-header-yellow',
                        resultClass: 'ilabel-result-yellow'
                    };
                }
            }
        }
    }
    
    // 5. 普通单
    console.log('所有检查通过，标记为普通单');
    return {
        type: 'normal',
        message: '该直播为普通单',
        color: 'normal',
        headerClass: 'ilabel-header-normal',
        resultClass: 'ilabel-result-normal'
    };
}

// ==================== 弹窗显示部分（参考旧版） ====================

function showPopup(liveInfo, reviewer, checkResult) {
    console.log('准备显示弹窗...');
    
    // 移除现有弹窗
    removePopup();
    
    // 检查开关状态
    const reminderEnabled = window.getReminderStatus ? window.getReminderStatus() : true;
    console.log('提醒开关状态:', reminderEnabled ? '开启' : '关闭');
    
    // 开关关闭时，只有普通单不显示弹窗；其他检查类型都要显示
    if (!reminderEnabled && checkResult.type === 'normal') {
        console.log('提醒开关已关闭，普通单不显示弹窗');
        return;
    }
    
    console.log('开始创建弹窗元素...');
    
    // 创建遮罩
    const overlay = document.createElement('div');
    overlay.id = 'notification-overlay';
    overlay.className = 'ilabel-overlay';
    overlay.onclick = removePopup;
    
    // 创建弹窗容器
    const notification = document.createElement('div');
    notification.id = 'custom-notification';
    notification.className = 'ilabel-custom-notification';
    notification.onclick = (e) => e.stopPropagation();
    
    // 格式化时间
    const now = new Date().toLocaleString();
    const startTime = liveInfo.streamStartTime ? formatTimestamp(liveInfo.streamStartTime) : '无';
    
    // 构建弹窗HTML（参考旧版样式）
    notification.innerHTML = `
        <div class="ilabel-notification-header ${checkResult.headerClass}">
            <span>直播审核信息</span>
            <button class="ilabel-notification-close">&times;</button>
        </div>

        <div class="ilabel-notification-content">
            <div class="ilabel-info-row">
                <span class="ilabel-info-label">直播ID:</span>
                <span class="ilabel-info-value">
                    <span id="liveId-value" class="ilabel-liveid-value" title="点击复制">${liveInfo.liveId}</span>
                    <button class="ilabel-copy-btn">复制</button>
                </span>
            </div>
            
            <div class="ilabel-info-row">
                <span class="ilabel-info-label">直播间描述:</span>
                <span class="ilabel-info-value">${liveInfo.description || '无'}</span>
            </div>
            
            <div class="ilabel-info-row">
                <span class="ilabel-info-label">主播昵称:</span>
                <span class="ilabel-info-value">${liveInfo.nickname || '无'}</span>
            </div>
            
            <div class="ilabel-info-row">
                <span class="ilabel-info-label">主播简介:</span>
                <span class="ilabel-info-value">${liveInfo.signature || '无'}</span>
            </div>
            
            <div class="ilabel-info-row">
                <span class="ilabel-info-label">主播认证:</span>
                <span class="ilabel-info-value">${liveInfo.authStatus || '未认证'}</span>
            </div>
            
            <div class="ilabel-info-row">
                <span class="ilabel-info-label">开播地:</span>
                <span class="ilabel-info-value">${liveInfo.createLiveArea || '无'}</span>
            </div>
            
            <div class="ilabel-info-row">
                <span class="ilabel-info-label">开播位置:</span>
                <span class="ilabel-info-value">${liveInfo.poiName || '无'}</span>
            </div>
            
            <div class="ilabel-info-row">
                <span class="ilabel-info-label">开播时间:</span>
                <span class="ilabel-info-value">${startTime}</span>
            </div>
            
            <div class="ilabel-info-row">
                <span class="ilabel-info-label">审核人员:</span>
                <span class="ilabel-info-value">${reviewer || '无'}</span>
            </div>
            
            <div class="ilabel-info-row">
                <span class="ilabel-info-label">当前时间:</span>
                <span class="ilabel-info-value">${now}</span>
            </div>

            <div class="ilabel-result-box ${checkResult.resultClass}">
                ${checkResult.message}
            </div>
        </div>

        <div class="ilabel-notification-footer">
            <button id="close-notification-btn" class="ilabel-confirm-btn">
                确认并关闭
            </button>
        </div>
    `;
    
    // 添加到页面
    document.body.appendChild(overlay);
    document.body.appendChild(notification);
    
    console.log('弹窗已添加到页面');
    
    // 设置事件监听（参考旧版）
    setTimeout(() => {
        const closeBtn = document.getElementById('close-notification-btn');
        const closeIcon = notification.querySelector('.ilabel-notification-close');
        const liveIdElement = document.getElementById('liveId-value');
        const copyBtn = notification.querySelector('.ilabel-copy-btn');
        
        // 确认按钮点击事件
        if (closeBtn) {
            closeBtn.onclick = () => {
                console.log('确认按钮点击');
                removePopup();
            };
        }
        
        // 关闭图标点击事件
        if (closeIcon) {
            closeIcon.onclick = removePopup;
        }
        
        // LiveID点击复制
        if (liveIdElement) {
            liveIdElement.onclick = () => {
                if (copyToClipboard(liveInfo.liveId)) {
                    const originalText = liveIdElement.textContent;
                    liveIdElement.textContent = '已复制!';
                    liveIdElement.style.backgroundColor = '#52c41a';
                    liveIdElement.style.color = 'white';
                    setTimeout(() => {
                        liveIdElement.textContent = originalText;
                        liveIdElement.style.backgroundColor = '';
                        liveIdElement.style.color = '';
                    }, 1500);
                }
            };
        }
        
        // 复制按钮点击
        if (copyBtn) {
            copyBtn.onclick = () => {
                if (copyToClipboard(liveInfo.liveId)) {
                    copyBtn.textContent = '已复制';
                    copyBtn.classList.add('ilabel-copied');
                    setTimeout(() => {
                        copyBtn.textContent = '复制';
                        copyBtn.classList.remove('ilabel-copied');
                    }, 2000);
                }
            };
        }
        
        // ESC键关闭
        document.addEventListener('keydown', function closeOnEsc(e) {
            if (e.key === 'Escape') {
                removePopup();
                document.removeEventListener('keydown', closeOnEsc);
            }
        });
    }, 100);
    
    // 记录弹窗开始时间
    popupStartTime = Date.now();
    
    // 设置推送定时器（如果审核人员在白名单中）
    if (reviewer && REVIEWER_WHITELIST_ARRAY.includes(reviewer) && reminderEnabled) {
        console.log('审核人员在白名单中，设置60秒后推送:', reviewer);
        
        popupTimer = setTimeout(() => {
            // 检查弹窗是否仍然存在
            if (document.contains(notification)) {
                console.log('弹窗超过60秒未确认，发送推送提醒');
                const mentionedList = [reviewer];
                const pushMessage = `新单未确认，${checkResult.message}`;
                sendWeChatPush(pushMessage, mentionedList);
            }
        }, 60000); // 1分钟后
    }
    
    console.log('弹窗显示完成，类型:', checkResult.type);
}

// 移除弹窗
function removePopup() {
    const notification = document.getElementById('custom-notification');
    const overlay = document.getElementById('notification-overlay');
    
    if (notification) notification.remove();
    if (overlay) overlay.remove();
    
    if (popupTimer) {
        clearTimeout(popupTimer);
        popupTimer = null;
        console.log('推送定时器已取消');
    }
    
    popupStartTime = null;
    console.log('弹窗已移除');
}

// ==================== 请求拦截部分 ====================

// 绑定XMLHttpRequest拦截器
function bindXHRInterceptor() {
    if (xhrInterceptorBound) return;
    
    console.log('绑定XMLHttpRequest拦截器...');
    
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
        this._requestURL = url;
        this._requestMethod = method;
        return originalXHROpen.apply(this, arguments);
    };
    
    XMLHttpRequest.prototype.send = function(...args) {
        const originalOnReadyStateChange = this.onreadystatechange;
        const originalOnLoad = this.onload;
        
        this.onreadystatechange = function() {
            if (this.readyState === 4 && this.status === 200) {
                handleResponse(this);
            }
            
            if (originalOnReadyStateChange) {
                originalOnReadyStateChange.apply(this, arguments);
            }
        };
        
        this.onload = function() {
            if (this.status === 200) {
                handleResponse(this);
            }
            
            if (originalOnLoad) {
                originalOnLoad.apply(this, arguments);
            }
        };
        
        return originalXHRSend.apply(this, args);
    };
    
    xhrInterceptorBound = true;
    console.log('XMLHttpRequest拦截器已绑定成功');
}

// 处理响应数据
async function handleResponse(xhr) {
    const requestURL = xhr._requestURL;
    
    if (requestURL && requestURL.includes('get_live_info_batch')) {
        console.log('检测到目标API请求:', requestURL);
        
        try {
            const responseText = xhr.responseText;
            if (responseText) {
                const responseData = JSON.parse(responseText);
                console.log('API响应数据:', responseData);
                
                const liveInfo = parseLiveInfo(responseData);
                
                if (liveInfo) {
                    console.log('直播信息解析成功，获取审核人员信息...');
                    
                    // 获取审核人员信息
                    const reviewer = await getReviewerInfo();
                    console.log('审核人员:', reviewer);
                    
                    // 执行检查
                    const checkResult = checkInfo(liveInfo, reviewer);
                    console.log('检查结果:', checkResult);
                    
                    // 显示弹窗
                    setTimeout(() => {
                        showPopup(liveInfo, reviewer, checkResult);
                    }, 300);
                }
            }
        } catch (err) {
            console.error('解析响应数据失败:', err);
        }
    }
}

// ==================== 初始化 ====================

function init() {
    if (isInitialized) {
        console.log('脚本已初始化');
        return;
    }
    
    console.log('iLabel远程脚本初始化...');
    
    // 添加样式
    addStyles();
    
    // 绑定XMLHttpRequest拦截器
    bindXHRInterceptor();
    
    // 监听DOM变化以重新绑定拦截器
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeName === 'SCRIPT' || node.nodeName === 'IFRAME') {
                        console.log('检测到新的script或iframe，重新绑定拦截器');
                        bindXHRInterceptor();
                    }
                });
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    isInitialized = true;
    console.log('iLabel远程脚本初始化完成');
}

// 初始化（立即执行）
(function() {
    console.log('==================== iLabel远程脚本加载 ====================');
    console.log('开关状态函数存在:', typeof window.getReminderStatus === 'function');
    console.log('当前开关状态:', window.getReminderStatus ? window.getReminderStatus() : '未定义');
    
    // 立即开始初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('DOM加载完成，开始初始化');
            init();
        });
    } else {
        console.log('文档已就绪，立即初始化');
        init();
    }
    
    // 防止脚本被卸载
    window.addEventListener('beforeunload', function() {
        console.log('页面即将卸载，重新绑定拦截器');
        setTimeout(() => {
            if (isInitialized) {
                bindXHRInterceptor();
            }
        }, 100);
    });
})();

// 导出配置
window.ILABEL_CONFIG = CONFIG;
console.log('iLabel远程脚本加载完成');
