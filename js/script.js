const API_URL = 'https://youtube-screenshot-api.shaowenyi1227.workers.dev';

async function getScreenshots() {
    const urlInput = document.getElementById('youtube-url');
    const loading = document.getElementById('loading');
    const container = document.getElementById('screenshots-container');
    
    // 输入验证
    if (!urlInput.value) {
        alert('Please enter a valid YouTube URL');
        return;
    }

    if (!urlInput.value.includes('youtube.com/') && !urlInput.value.includes('youtu.be/')) {
        alert('Please enter a valid YouTube URL');
        return;
    }

    try {
        loading.style.display = 'block';
        container.innerHTML = '';
        
        // 分析视频
        const response = await fetch(`${API_URL}/api/analyze-frames`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: urlInput.value.trim()
            })
        });

        if (!response.ok) {
            throw new Error(`Analysis failed: ${response.status}`);
        }

        const data = await response.json();
        if (data.status === 'success') {
            displayResults(data.data);
        } else {
            throw new Error(data.message || 'Analysis failed');
        }
    } catch (error) {
        container.innerHTML = `
            <div class="error-message">
                <p>Error: ${error.message}</p>
                <button onclick="getScreenshots()" class="retry-button">Retry</button>
            </div>
        `;
        alert('Error: ' + error.message);
    } finally {
        loading.style.display = 'none';
    }
}

function displayResults(data) {
    const container = document.getElementById('screenshots-container');
    
    // 保存 frames 数据供下载使用
    window.currentFrames = data.frames;
    
    // 显示视频信息
    const infoHtml = `
        <div class="video-info">
            <h2>Video Information</h2>
            <p><strong>Title:</strong> ${data.title || 'N/A'}</p>
            <p><strong>Author:</strong> ${data.author || 'N/A'}</p>
            <p><strong>Duration:</strong> ${data.duration || 'N/A'}</p>
        </div>
    `;
    
    // 显示场景截图
    const scenesHtml = `
        <div class="scenes-container">
            <h2>Scenes</h2>
            <div class="scenes-grid">
                ${data.frames.map((frame, index) => `
                    <div class="scene-item">
                        <img src="data:image/jpeg;base64,${frame.data}" 
                             alt="Scene ${index + 1}"
                             title="Scene ${index + 1}">
                        <div class="scene-info">
                            <span>Scene ${index + 1}</span>
                            <span>${frame.timestamp || ''}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
            ${data.frames.length > 0 ? `
                <button onclick="downloadScenes()" class="download-button">
                    Download All Scenes
                </button>
            ` : '<p>No scenes available</p>'}
        </div>
    `;
    
    container.innerHTML = infoHtml + scenesHtml;
}

async function downloadScenes() {
    if (!window.currentFrames || window.currentFrames.length === 0) {
        alert('No scenes available to download');
        return;
    }

    try {
        const loading = document.getElementById('loading');
        loading.style.display = 'block';
        
        const response = await fetch(`${API_URL}/api/download-frames`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                frames: window.currentFrames
            })
        });
        
        if (!response.ok) {
            throw new Error(`Download failed: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.status === 'success') {
            // 创建下载链接
            const binary = atob(data.data.file);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'application/zip' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'youtube-scenes.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } else {
            throw new Error(data.message || 'Download failed');
        }
    } catch (error) {
        alert('Download failed: ' + error.message);
    } finally {
        const loading = document.getElementById('loading');
        loading.style.display = 'none';
    }
}

// 添加输入验证
document.getElementById('youtube-url').addEventListener('paste', function(e) {
    // 延迟执行以确保值已经粘贴
    setTimeout(() => {
        const url = this.value;
        if (url && (url.includes('youtube.com/') || url.includes('youtu.be/'))) {
            getScreenshots();
        }
    }, 100);
});

// 添加回车键触发分析
document.getElementById('youtube-url').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        getScreenshots();
    }
}); 