// ==================== 配置部分 ====================
const CONFIG = {
  ANCHOR_WHITELIST: "百年对语 东南军迷俱乐部 广东新闻广描 广东新闻频道 广东移动频道 湖南国际瑰宝雅集 湖南国际频道文创甄选 湖南国际珍宝收藏 琳琅瑰宝雅集 央博匠心 雨家饰品 雨家首饰 豫见新财富 BRTV大家收藏 BRTV首都经济报道 好物珍宝 央博典藏 央博非遗珍宝 央博好物 央博木作 央博器",
  PUNISHMENT_KEYWORDS: "金包 金重量 金含量 金镯子 金项链 金子这么便宜 缅 曼德勒 越南",
  REVIEWER_WHITELIST: "王鹏程 刘丹娜 蒋娜娜 刘维青 李晓露 何浩 卢洪",
  REVIEWER_BLACKLIST: "杨松江",
  PUSH_URL: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=90014c35-804f-489e-b203-bf59f46f69fb"
};

// 转换为数组
const ANCHOR_WHITELIST_ARRAY = CONFIG.ANCHOR_WHITELIST.split(' ').filter(item => item.trim());
const PUNISHMENT_KEYWORDS_ARRAY = CONFIG.PUNISHMENT_KEYWORDS.split(' ').filter(item => item.trim());
const REVIEWER_WHITELIST_ARRAY = CONFIG.REVIEWER_WHITELIST.split(' ').filter(item => item.trim());
const REVIEWER_BLACKLIST_ARRAY = CONFIG.REVIEWER_BLACKLIST.split(' ').filter(item => item.trim());

console.log('iLabel远程脚本开始执行');

// ==================== 全局变量 ====================
let popupTimer = null;
let isInitialized = false;
let reminderEnabled = true; // 默认开启提醒

// ==================== 样式定义 ====================
const STYLES = `
    /* 主样式 */
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
        from { opacity: 0; transform: translate(-50%, -60%); }
        to { opacity: 1; transform: translate(-50%, -50%); }
    }
    
    /* 弹窗头部 */
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
    
    .ilabel-header-normal { background: #1890ff; }
    .ilabel-header-green { background: #52c41a; }
    .ilabel-header-yellow { background: #faad14; }
    .ilabel-header-red { background: #f5222d; }
    
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
    
    .ilabel-notification-close:hover { background: rgba(255,255,255,0.2); }
    
    /* 弹窗内容 */
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
    
    .ilabel-copy-btn:hover { background: #40a9ff; }
    .ilabel-copy-btn:active { background: #096dd9; }
    .ilabel-copied { background: #52c41a !important; }
    
    /* 结果框 */
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
    
    /* 弹窗底部 */
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
    
    .ilabel-confirm-btn:hover { background: #40a9ff; }
    
    /* 遮罩层 */
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
    
    .ilabel-liveid-value:hover { background-color: #e8e8e8; }
    
    /* 开关样式 */
    .ilabel-switch-container {
        position: fixed;
        bottom: 0px;
        left: 60px;
        z-index: 999999;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        padding: 8px;
        display: flex;
        align-items: center;
        min-width: auto;
    }
    
    .ilabel-switch {
        position: relative;
        display: inline-block;
        width: 40px;
        height: 20px;
    }
    
    .ilabel-switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }
    
    .ilabel-switch-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #ccc;
        transition: .4s;
        border-radius: 20px;
    }
    
    .ilabel-switch-slider:before {
        position: absolute;
        content: "";
        height: 14px;
        width: 14px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: .4s;
        border-radius: 50%;
    }
    
    input:checked + .ilabel-switch-slider {
        background-color: #07c160;
    }
    
    input:checked + .ilabel-switch-slider:before {
        transform: translateX(20px);
    }
    
    .ilabel-switch-container:hover {
        box-shadow: 0 4px 15px rgba(0,0,0,0.25);
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
    }
}

// 获取网络北京时间
function getBeijingTime() {
    const now = new Date();
    const beijingOffset = 8 * 60;
    const localOffset = now.getTimezoneOffset();
    return new Date(now.getTime() + (beijingOffset + localOffset) * 60 * 1000);
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
        navigator.clipboard.writeText(text).then(() => {
            return true;
        }).catch(() => {
            // 降级方案
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            return success;
        });
    } catch (err) {
        console.error('复制失败:', err);
        return false;
    }
}

// 解码Unicode字符串
function decodeUnicode(str) {
    if (!str) return '';
    return str.replace(/\\u([\d\w]{4})/gi, function(match, grp) {
        return String.fromCharCode(parseInt(grp, 16));
    });
}

// ==================== 推送功能 ====================

// 发送企业微信推送（通过调用用户脚本的推送函数）
function sendWeChatPush(message, mentionedList = []) {
    console.log('远程库调用推送:', message, mentionedList);
    // 调用用户脚本的推送函数
    if (window._ilabelSendPush) {
        window._ilabelSendPush(message, mentionedList);
    } else {
        console.error('推送函数未初始化');
    }
}

// ==================== 信息获取部分 ====================

// 获取审核人员信息
async function getReviewerInfo() {
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
                const dashIndex = fullName.indexOf('-');
                if (dashIndex !== -1) {
                    return fullName.substring(dashIndex + 1).trim();
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
    
    // 1. 审核人员检查
    if (reviewer && REVIEWER_BLACKLIST_ARRAY.includes(reviewer)) {
        return {
            type: 'blacklist',
            message: '审核人员在黑名单中',
            color: 'red',
            headerClass: 'ilabel-header-red',
            resultClass: 'ilabel-result-red'
        };
    }
    
    // 2. 预埋单检查
    if (liveInfo.streamStartTime) {
        const beijingTime = getBeijingTime();
        const currentTimestamp = Math.floor(beijingTime.getTime() / 1000);
        
        if (!isSameDay(liveInfo.streamStartTime, currentTimestamp)) {
            return {
                type: 'quality',
                message: '该直播为预埋单',
                color: 'red',
                headerClass: 'ilabel-header-red',
                resultClass: 'ilabel-result-red'
            };
        }
    }
    
    // 3. 豁免检查
    if (ANCHOR_WHITELIST_ARRAY.includes(liveInfo.nickname)) {
        return {
            type: 'whitelist',
            message: '该主播为白名单或事业单位',
            color: 'green',
            headerClass: 'ilabel-header-green',
            resultClass: 'ilabel-result-green'
        };
    }
    
    if (liveInfo.authStatus && liveInfo.authStatus.includes('事业单位')) {
        return {
            type: 'whitelist',
            message: '该主播为白名单或事业单位',
            color: 'green',
            headerClass: 'ilabel-header-green',
            resultClass: 'ilabel-result-green'
        };
    }
    
    // 4. 处罚检查
    const checkFields = [
        { field: liveInfo.description, name: '直播间描述' },
        { field: liveInfo.nickname, name: '主播昵称' },
        { field: liveInfo.poiName, name: '开播位置' }
    ];
    
    for (const check of checkFields) {
        if (check.field) {
            for (const keyword of PUNISHMENT_KEYWORDS_ARRAY) {
                if (check.field.includes(keyword)) {
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
    return {
        type: 'normal',
        message: '该直播为普通单',
        color: 'normal',
        headerClass: 'ilabel-header-normal',
        resultClass: 'ilabel-result-normal'
    };
}

// ==================== 开关功能 ====================

// 创建开关按钮
function createSwitchButton() {
    const container = document.createElement('div');
    container.className = 'ilabel-switch-container';
    container.title = reminderEnabled ? '提醒已开启' : '提醒已关闭';
    
    const switchContainer = document.createElement('label');
    switchContainer.className = 'ilabel-switch';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = reminderEnabled;
    
    const slider = document.createElement('span');
    slider.className = 'ilabel-switch-slider';
    
    // 保存状态变化
    checkbox.addEventListener('change', function() {
        reminderEnabled = this.checked;
        container.title = this.checked ? '提醒已开启' : '提醒已关闭';
        
        // 保存到localStorage
        try {
            localStorage.setItem('ilabel_reminder_enabled', this.checked.toString());
        } catch (e) {
            console.error('保存开关状态失败:', e);
        }
    });
    
    switchContainer.appendChild(checkbox);
    switchContainer.appendChild(slider);
    container.appendChild(switchContainer);
    
    return container;
}

// 添加开关按钮到页面
function addSwitchButton() {
    const switchBtn = createSwitchButton();
    document.body.appendChild(switchBtn);
    console.log('开关按钮已添加到页面');
}

// 从localStorage加载开关状态
function loadReminderStatus() {
    try {
        const saved = localStorage.getItem('ilabel_reminder_enabled');
        if (saved !== null) {
            reminderEnabled = saved === 'true';
        }
    } catch (e) {
        console.error('加载开关状态失败:', e);
    }
}

// 暴露获取开关状态的方法
function getReminderStatus() {
    return reminderEnabled;
}

// ==================== 弹窗显示部分 ====================

function showPopup(liveInfo, reviewer, checkResult) {
    // 移除现有弹窗
    removePopup();
    
    // 开关关闭时，只有普通单不显示弹窗
    if (!reminderEnabled && checkResult.type === 'normal') {
        return;
    }
    
    // 创建遮罩
    const overlay = document.createElement('div');
    overlay.className = 'ilabel-overlay';
    overlay.onclick = removePopup;
    
    // 创建弹窗容器
    const notification = document.createElement('div');
    notification.className = 'ilabel-custom-notification';
    notification.onclick = (e) => e.stopPropagation();
    
    // 格式化时间
    const startTime = liveInfo.streamStartTime ? formatTimestamp(liveInfo.streamStartTime) : '无';
    
    // 检查是否需要推送
    const needPush = reviewer && REVIEWER_WHITELIST_ARRAY.includes(reviewer) && reminderEnabled;
    const pushInfo = needPush ? 
        `<div style="color: #faad14; font-size: 13px; margin-top: 5px; text-align: center;">
            ⚠️ 20秒内未确认将发送提醒给 ${reviewer}
        </div>` : '';
    
    // 构建弹窗HTML
    notification.innerHTML = `
        <div class="ilabel-notification-header ${checkResult.headerClass}">
            <span>直播审核信息</span>
            <button class="ilabel-notification-close">&times;</button>
        </div>

        <div class="ilabel-notification-content">
            <div class="ilabel-info-row">
                <span class="ilabel-info-label">直播ID:</span>
                <span class="ilabel-info-value">
                    <span class="ilabel-liveid-value" title="点击复制">${liveInfo.liveId}</span>
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
                <span class="ilabel-info-label">主播认证:</span>
                <span class="ilabel-info-value">${liveInfo.authStatus || '未认证'}</span>
            </div>
            
            <div class="ilabel-info-row">
                <span class="ilabel-info-label">开播时间:</span>
                <span class="ilabel-info-value">${startTime}</span>
            </div>
            
            <div class="ilabel-info-row">
                <span class="ilabel-info-label">审核人员:</span>
                <span class="ilabel-info-value">${reviewer || '无'}</span>
            </div>

            <div class="ilabel-result-box ${checkResult.resultClass}">
                ${checkResult.message}
                ${pushInfo}
            </div>
        </div>

        <div class="ilabel-notification-footer">
            <button class="ilabel-confirm-btn">确认并关闭</button>
        </div>
    `;
    
    // 添加到页面
    document.body.appendChild(overlay);
    document.body.appendChild(notification);
    
    // 设置事件监听
    const closeBtn = notification.querySelector('.ilabel-confirm-btn');
    const closeIcon = notification.querySelector('.ilabel-notification-close');
    const copyBtn = notification.querySelector('.ilabel-copy-btn');
    
    closeBtn.onclick = removePopup;
    closeIcon.onclick = removePopup;
    
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
    
    // ESC键关闭
    const escHandler = (e) => {
        if (e.key === 'Escape') removePopup();
    };
    document.addEventListener('keydown', escHandler);
    notification._escHandler = escHandler;
    
    // 标记是否已推送过（确保每个弹窗只推送一次）
    notification._hasPushed = false;
    
    // 设置推送定时器（20秒）
    if (needPush) {
        popupTimer = setTimeout(() => {
            if (document.body.contains(notification) && !notification._hasPushed) {
                // 标记已推送
                notification._hasPushed = true;
                
                const pushMessage = `新单未确认，${checkResult.message} @${reviewer}`;
                sendWeChatPush(pushMessage, [reviewer]);
                
                // 添加视觉提示
                const resultBox = notification.querySelector('.ilabel-result-box');
                const originalHTML = resultBox.innerHTML;
                resultBox.innerHTML = `
                    <div style="color: #f5222d; font-weight: bold;">
                        ⚠️ 已发送提醒给 ${reviewer}
                    </div>
                `;
                
                setTimeout(() => {
                    resultBox.innerHTML = originalHTML;
                }, 5000);
            }
        }, 20000);
    }
}

// 移除弹窗
function removePopup() {
    const notification = document.querySelector('.ilabel-custom-notification');
    const overlay = document.querySelector('.ilabel-overlay');
    
    if (notification) {
        if (notification._escHandler) {
            document.removeEventListener('keydown', notification._escHandler);
        }
        notification.remove();
    }
    
    if (overlay) overlay.remove();
    
    if (popupTimer) {
        clearTimeout(popupTimer);
        popupTimer = null;
    }
}

// ==================== 请求拦截部分 ====================

// 绑定XMLHttpRequest拦截器
function bindXHRInterceptor() {
    if (XMLHttpRequest.prototype._ilabel_intercepted) return;
    
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url) {
        this._requestURL = url;
        return originalOpen.apply(this, arguments);
    };
    
    XMLHttpRequest.prototype.send = function(...args) {
        const xhr = this;
        const originalOnReadyStateChange = xhr.onreadystatechange;
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4 && xhr.status === 200) {
                if (xhr._requestURL && xhr._requestURL.includes('get_live_info_batch')) {
                    try {
                        const responseData = JSON.parse(xhr.responseText);
                        const liveInfo = parseLiveInfo(responseData);
                        
                        if (liveInfo) {
                            getReviewerInfo().then(reviewer => {
                                const checkResult = checkInfo(liveInfo, reviewer);
                                setTimeout(() => {
                                    showPopup(liveInfo, reviewer, checkResult);
                                }, 300);
                            });
                        }
                    } catch (error) {
                        console.error('处理响应数据失败:', error);
                    }
                }
            }
            
            if (originalOnReadyStateChange) {
                originalOnReadyStateChange.apply(xhr, arguments);
            }
        };
        
        return originalSend.apply(xhr, args);
    };
    
    XMLHttpRequest.prototype._ilabel_intercepted = true;
}

// ==================== 初始化 ====================

function init() {
    if (isInitialized) return;
    
    console.log('iLabel远程脚本初始化...');
    
    // 添加样式
    addStyles();
    
    // 加载开关状态
    loadReminderStatus();
    
    // 绑定XMLHttpRequest拦截器
    bindXHRInterceptor();
    
    // 添加开关按钮（等待DOM加载）
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            addSwitchButton();
        });
    } else {
        addSwitchButton();
    }
    
    isInitialized = true;
    console.log('iLabel远程脚本初始化完成');
}

// ==================== 立即执行 ====================

// 等待页面基本就绪
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    setTimeout(init, 100);
}

// 导出配置和方法
window.ILABEL_CONFIG = CONFIG;
window.getReminderStatus = getReminderStatus;
