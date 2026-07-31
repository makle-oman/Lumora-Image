<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  Activity,
  Check,
  Copy,
  Key,
  Plus,
  ShieldCheck,
  Trash2,
  Zap,
} from 'lucide-vue-next'
import { useUserStore } from '../../stores/user'
import { useGenerationStore } from '../../stores/generation'
import { resolveServiceUrl } from '../../services/http'
import CopyCodeBlock from './components/CopyCodeBlock/index.vue'

const userStore = useUserStore()
const generationStore = useGenerationStore()
const copiedKeyId = ref('')
const copiedText = ref('')
const activeSubNav = ref<'overview' | 'keys' | 'logs' | 'docs'>('overview')
const activeCodeLang = ref<'curl' | 'python' | 'node' | 'go'>('curl')

// Key creation & visibility state
const isCreatingKey = ref(false)
const newKeyName = ref('')
const newKeyScope = ref<'full' | 'read' | 'generate'>('full')
const isCreatingProvider = ref(false)
const providerName = ref('')
const providerBaseUrl = ref('https://api.openai.com')
const providerApiKey = ref('')

// Interactive Try-It-Out State

async function copyText(text: string, id?: string): Promise<void> {
  await navigator.clipboard.writeText(text)
  if (id) {
    copiedKeyId.value = id
    setTimeout(() => {
      if (copiedKeyId.value === id) copiedKeyId.value = ''
    }, 1600)
  } else {
    copiedText.value = text
    setTimeout(() => {
      if (copiedText.value === text) copiedText.value = ''
    }, 1600)
  }
}

async function handleCreateKey(): Promise<void> {
  if (!newKeyName.value.trim()) return
  try {
    await userStore.createApiKey(newKeyName.value.trim(), newKeyScope.value)
    newKeyName.value = ''
    isCreatingKey.value = false
  }
  catch {
    // The store exposes the server error next to the form.
  }
}

async function handleCreateProvider(): Promise<void> {
  if (!providerName.value.trim() || !providerBaseUrl.value.trim() || !providerApiKey.value.trim()) return
  try {
    await userStore.createProvider({
      name: providerName.value.trim(),
      baseUrl: providerBaseUrl.value.trim(),
      apiKey: providerApiKey.value.trim(),
    })
    providerName.value = ''
    providerApiKey.value = ''
    isCreatingProvider.value = false
    await generationStore.checkConfiguration()
  }
  catch {
    // The store exposes the server error next to the form.
  }
}

async function handleActivateProvider(id: string): Promise<void> {
  await userStore.activateProvider(id)
  await generationStore.checkConfiguration()
}

async function handleDeleteProvider(id: string): Promise<void> {
  await userStore.deleteProvider(id)
  await generationStore.checkConfiguration()
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

const currentApiKey = 'lum-live-xxxxxxxxxxxxxxxx'

const codeSnippets = computed(() => ({
  curl: `curl ${docsBaseUrl}/images/generations \\
  -H "Authorization: Bearer ${currentApiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-image-2",
    "prompt": "奢华护肤品微缩施工现场，商业产品摄影，超写实 CGI",
    "size": "1024x1024",
    "n": 1
  }'`,

  python: `import openai

client = openai.OpenAI(
    api_key="${currentApiKey}",
    base_url="${docsBaseUrl}"
)

response = client.images.generate(
    model="gpt-image-2",
    prompt="一只在咖啡杯旁边打盹的橘猫，柔和自然光，写实风格摄影",
    size="1024x1024",
    n=1
)

print(response.data[0].b64_json)`,

  node: `import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: '${currentApiKey}',
  baseURL: '${docsBaseUrl}',
});

async function main() {
  const image = await openai.images.generate({
    model: 'gpt-image-2',
    prompt: '赛博朋克霓虹雨夜，高科技悬浮飞行器，8k 极简渲染',
    size: '1024x1024',
  });

  console.log(image.data[0].b64_json);
}

main();`,

  go: `package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

func main() {
	url := "${docsBaseUrl}/images/generations"
	payload := map[string]interface{}{
		"model":  "gpt-image-2",
		"prompt": "3D 抽象流体水晶雕塑，极简主义，绚丽光谱折射光影",
		"size":   "1024x1024",
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(body))
	req.Header.Set("Authorization", "Bearer ${currentApiKey}")
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	fmt.Println("Status:", resp.Status)
}`,
}))

const docsBaseUrl = resolveServiceUrl('/v1')
const docsCode = {
  generationResponse: `{
  "created": 1785110400,
  "data": [{ "b64_json": "iVBORw0KGgo..." }],
  "usage": {
    "input_tokens": 32,
    "output_tokens": 4096,
    "total_tokens": 4128
  }
}`,
  imageFormats: `// images 数组中每个元素可以是以下任意格式：

// 1. data URL 字符串
"data:image/png;base64,iVBORw0KGgo..."

// 2. 对象：image_url 字段
{ "image_url": "data:image/png;base64,iVBORw0KGgo..." }

// 3. 对象：嵌套 url
{ "image_url": { "url": "data:image/jpeg;base64,/9j/4AAQ..." } }

// 4. 对象：直接传 base64 数据
{
  "b64_json": "iVBORw0KGgo...",
  "mime_type": "image/png",
  "filename": "ref.png"
}`,
  editSingleCurl: `curl -X POST ${docsBaseUrl}/images/edits \\
  -H "Authorization: Bearer lum-live-xxxxxxxx" \\
  -F "prompt=Add a rainbow in the sky" \\
  -F "size=1024x1024" \\
  -F "image=@photo.png"`,
  editMultiCurl: `# All images are used as reference context for a single output
curl -X POST ${docsBaseUrl}/images/edits \\
  -H "Authorization: Bearer lum-live-xxxxxxxx" \\
  -F "prompt=Combine these photos into a collage" \\
  -F "size=1792x1024" \\
  -F "image=@photo1.png" \\
  -F "image=@photo2.png" \\
  -F "image=@photo3.png"

# → Returns 1 result image (costs 1 credit)`,
  editJsonCurl: `# All images serve as combined reference context
curl -X POST ${docsBaseUrl}/images/edits \\
  -H "Authorization: Bearer lum-live-xxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
  "prompt": "Merge these two images into a poster",
  "size": "1024x1792",
  "images": [
    "data:image/png;base64,iVBORw0KGgo...",
    {
      "b64_json": "/9j/4AAQSkZJRg...",
      "mime_type": "image/jpeg",
      "filename": "background.jpg"
    }
  ]
}'

# → Returns 1 result (costs 1 credit)`,
  editJavaScript: `// All reference images are sent in ONE request as combined context
const formData = new FormData();
formData.append('prompt', 'Combine into anime style poster');
formData.append('size', '1024x1024');

// Multiple images = combined reference for 1 output
formData.append('image', file1);
formData.append('image', file2);
formData.append('image', file3);

const response = await fetch('${docsBaseUrl}/images/edits', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer lum-live-xxxxxxxx' },
  body: formData,
});
const data = await response.json();
console.log(data.data[0].b64_json);`,
  editPython: `import base64
import requests

API_KEY = "lum-live-xxxxxxxx"

# Method 1: multipart upload (all images in ONE request)
files = [
    ("image", ("photo1.png", open("photo1.png", "rb"), "image/png")),
    ("image", ("photo2.jpg", open("photo2.jpg", "rb"), "image/jpeg")),
    ("image", ("photo3.png", open("photo3.png", "rb"), "image/png")),
]
resp = requests.post(
    "${docsBaseUrl}/images/edits",
    headers={"Authorization": f"Bearer {API_KEY}"},
    data={"prompt": "Combine these into a collage", "size": "1024x1024"},
    files=files,
)
print(resp.json()["data"][0])

# Method 2: JSON with base64
img1_b64 = base64.b64encode(open("photo1.png", "rb").read()).decode()
img2_b64 = base64.b64encode(open("photo2.jpg", "rb").read()).decode()
resp = requests.post(
    "${docsBaseUrl}/images/edits",
    headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
    json={
        "prompt": "Merge into a collage",
        "images": [
            f"data:image/png;base64,{img1_b64}",
            {"b64_json": img2_b64, "mime_type": "image/jpeg"},
        ],
    },
)
print(resp.json()["data"][0])`,
  editResponse: `{
  "data": [
    { "b64_json": "iVBORw0KGgo..." }
  ],
  "model": "gpt-image-2",
  "usage": {
    "input_tokens": 350,
    "output_tokens": 4080,
    "total_tokens": 4430
  }
}`,
  asyncGenerationResponse: `{
  "taskIds": ["api_1719000000000_abc123"],
  "creditsReserved": 1,
  "model": "gpt-image-2"
}`,
  asyncEditCurl: `curl -X POST ${docsBaseUrl}/images/edits/async \\
  -H "Authorization: Bearer lum-live-xxxxxxxx" \\
  -F "prompt=Convert all to cyberpunk style" \\
  -F "image=@photo1.png" \\
  -F "image=@photo2.png" \\
  -F "image=@photo3.png"`,
  asyncEditJsonCurl: `curl -X POST ${docsBaseUrl}/images/edits/async \\
  -H "Authorization: Bearer lum-live-xxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
  "prompt": "Style transfer: oil painting",
  "images": [
    "data:image/png;base64,iVBORw0KGgo...",
    "data:image/jpeg;base64,/9j/4AAQ..."
  ]
}'`,
  asyncEditResponse: `{
  "taskIds": ["api_1719000000000_xyz789", "api_1719000000001_abc456"],
  "creditsReserved": 2,
  "model": "gpt-image-2"
}`,
  taskStatusResponse: `{
  "items": [
    {
      "id": "api_1719000000000_abc123",
      "status": "success",
      "data": [{ "b64_json": "iVBORw0KGgo..." }],
      "error": null,
      "createdAt": "2026-07-27T12:00:00Z",
      "updatedAt": "2026-07-27T12:01:00Z"
    },
    {
      "id": "api_1719000000001_xyz789",
      "status": "running",
      "data": [],
      "error": null,
      "createdAt": "2026-07-27T12:00:00Z",
      "updatedAt": "2026-07-27T12:00:25Z"
    }
  ]
}`,
  confirmRequest: `{
  "taskIds": ["api_1719000000000_abc123", "api_1719000000001_xyz789"]
}`,
  confirmResponse: `{
  "ok": true,
  "successCount": 2,
  "failCount": 0,
  "creditsUsed": 1,
  "creditsRefunded": 0
}`,
  creditsResponse: `{
  "credits": 120,
  "creditsReserved": 0,
  "plan": "Free",
  "creditCostPerImage": 1
}`,
  usageResponse: `{
  "totalCalls": 42,
  "dailyLimit": 10000,
  "averageLatencyMs": 49734,
  "recentCalls": [
    {
      "endpoint": "/v1/images/generations",
      "model": "gpt-image-2",
      "creditsUsed": 1,
      "status": "success",
      "durationMs": 49734,
      "createdAt": "2026-06-20 14:30:00"
    }
  ]
}`,
  errorResponse: `{
  "error": {
    "message": "API Key 无效或缺失",
    "type": "authentication_error",
    "param": null,
    "code": null
  }
}`,
  asyncFlow: `# 1. 提交异步任务
resp = POST /v1/images/generations/async
  {"prompt": "A cat on the moon", "n": 2}
# → {"taskIds": ["task_1", "task_2"], "creditsReserved": 2}

# 2. 轮询任务状态 (每 3-5 秒)
resp = GET /v1/tasks/task_1,task_2
# → {"items": [{"id":"task_1","status":"running"}, {"id":"task_2","status":"success","data":[...]}]}

# 3. 全部完成后汇总确认
resp = POST /v1/tasks/confirm
  {"taskIds": ["task_1", "task_2"]}
# → {"ok": true, "successCount": 2, "creditsUsed": 2, "creditsRefunded": 0}`,
  sdkGenerationJavaScript: `const response = await fetch('${docsBaseUrl}/images/generations', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer lum-live-xxxxxxxx',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prompt: 'A beautiful sunset over mountains',
    n: 2,
    size: '1024x1024',
  }),
});
const data = await response.json();
console.log(data.data.map(d => d.b64_json));`,
  sdkMultiReferenceJavaScript: `// Multi-reference: all images in one request → 1 result
const formData = new FormData();
formData.append('prompt', 'Combine into a movie poster');
formData.append('size', '1024x1792');
formData.append('image', fileInput1.files[0]);
formData.append('image', fileInput2.files[0]);
formData.append('image', fileInput3.files[0]);

const response = await fetch('${docsBaseUrl}/images/edits', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer lum-live-xxxxxxxx' },
  body: formData,
});
const data = await response.json();
console.log(data.data[0].b64_json);`,
  sdkBatchEditJavaScript: `// Batch edit: each image gets its own request → N results
const files = [file1, file2, file3];
const prompt = 'Convert to watercolor style';

const results = await Promise.all(
  files.map(async (file) => {
    const form = new FormData();
    form.append('prompt', prompt);
    form.append('image', file);
    const response = await fetch('${docsBaseUrl}/images/edits', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer lum-live-xxxxxxxx' },
      body: form,
    });
    return response.json();
  }),
);
results.forEach(result => console.log(result.data[0].b64_json));`,
  sdkAsyncPython: `import requests, time

API_KEY = "lum-live-xxxxxxxx"
BASE = "${docsBaseUrl}"

# 1. Submit async task
resp = requests.post(f"{BASE}/images/generations/async",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={"prompt": "A cat in space", "n": 2, "size": "1024x1024"})
task_ids = resp.json()["taskIds"]

# 2. Poll until done
while True:
    time.sleep(3)
    resp = requests.get(f"{BASE}/tasks/{','.join(task_ids)}",
        headers={"Authorization": f"Bearer {API_KEY}"})
    items = resp.json()["items"]
    if all(task["status"] in ("success", "error") for task in items):
        break

# 3. Confirm billing
requests.post(f"{BASE}/tasks/confirm",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={"taskIds": task_ids})

# 4. Get results
for item in items:
    if item["status"] == "success":
        print(item["data"][0]["b64_json"])`,
  sdkAsyncEditPython: `import requests, time

API_KEY = "lum-live-xxxxxxxx"
BASE = "${docsBaseUrl}"

# 1. Submit async edit with multiple reference images
files = [
    ("image", ("ref1.png", open("ref1.png", "rb"), "image/png")),
    ("image", ("ref2.jpg", open("ref2.jpg", "rb"), "image/jpeg")),
]
resp = requests.post(f"{BASE}/images/edits/async",
    headers={"Authorization": f"Bearer {API_KEY}"},
    data={"prompt": "Merge into a landscape painting"},
    files=files)
task_ids = resp.json()["taskIds"]

# 2. Poll until done
while True:
    time.sleep(3)
    resp = requests.get(f"{BASE}/tasks/{','.join(task_ids)}",
        headers={"Authorization": f"Bearer {API_KEY}"})
    items = resp.json()["items"]
    if all(task["status"] in ("success", "error") for task in items):
        break

# 3. Confirm billing
requests.post(f"{BASE}/tasks/confirm",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={"taskIds": task_ids})

# 4. Collect results
for item in items:
    if item["status"] == "success":
        print(item["data"][0]["b64_json"])`,
  batchEditCurl: `# 批量编辑 = 对 N 张图分别发送 N 个独立请求，每张图各自生成 1 个结果
# 每次请求只上传 1 张图

# 请求 1
curl -X POST ${docsBaseUrl}/images/edits \\
  -H "Authorization: Bearer lum-live-xxxxxxxx" \\
  -F "prompt=Convert to anime style" \\
  -F "image=@img1.png"

# 请求 2
curl -X POST ${docsBaseUrl}/images/edits \\
  -H "Authorization: Bearer lum-live-xxxxxxxx" \\
  -F "prompt=Convert to anime style" \\
  -F "image=@img2.png"

# 请求 3
curl -X POST ${docsBaseUrl}/images/edits \\
  -H "Authorization: Bearer lum-live-xxxxxxxx" \\
  -F "prompt=Convert to anime style" \\
  -F "image=@img3.png"

# → 3 个独立结果，消耗 3 积分`,
} as const

onMounted(() => {
  if (!userStore.isLoggedIn) {
    userStore.toggleAuthModal(true)
    return
  }
  void Promise.all([
    userStore.loadAccountData(false),
    generationStore.checkConfiguration(),
  ])
})

onUnmounted(() => {
  userStore.clearOneTimeApiKey()
})
</script>

<template>
  <div class="api-view">
    <!-- Top Header & Sub-Nav Tabs Matching rova.chat/developer -->
    <header class="api-header">
      <h1>API 接入</h1>
      <p>管理你的 API 密钥，查看用量统计，并查阅接口文档以快速集成</p>

      <!-- Main Developer Sub-Nav Tabs -->
      <nav class="api-tabs-bar">
        <button
          class="tab-item"
          :class="{ active: activeSubNav === 'overview' }"
          @click="activeSubNav = 'overview'"
        >
          概览
        </button>
        <button
          class="tab-item"
          :class="{ active: activeSubNav === 'keys' }"
          @click="activeSubNav = 'keys'"
        >
          API 密钥
        </button>
        <button
          class="tab-item"
          :class="{ active: activeSubNav === 'logs' }"
          @click="activeSubNav = 'logs'"
        >
          调用记录
        </button>
        <button
          class="tab-item"
          :class="{ active: activeSubNav === 'docs' }"
          @click="activeSubNav = 'docs'"
        >
          接口文档
        </button>
      </nav>
    </header>

    <!-- TAB 1: 概览 (Overview) -->
    <div v-if="activeSubNav === 'overview'" class="tab-content">
      <div class="dashboard-grid">
        <div class="stat-card">
          <div class="stat-icon purple">
            <Zap :size="20" />
          </div>
          <div class="stat-info">
            <span class="label">今日 API 调用量</span>
            <div class="val">{{ userStore.usage.todayCalls.toLocaleString() }} <span class="unit">/ {{ userStore.usage.dailyLimit.toLocaleString() }}</span></div>
            <div class="progress-bar">
              <div class="fill" :style="{ width: `${Math.min(100, userStore.usage.todayCalls / userStore.usage.dailyLimit * 100)}%` }" />
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon green">
            <ShieldCheck :size="20" />
          </div>
          <div class="stat-info">
            <span class="label">API 服务状态</span>
            <div class="val" :class="{ 'text-green': userStore.providers.some(item => item.isActive) }">
              <span class="status-dot" /> {{ userStore.providers.some(item => item.isActive) ? '运行正常' : '未配置' }}
            </div>
            <span class="subtext">{{ userStore.providers.find(item => item.isActive)?.name || '请添加并启用调用方' }}</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon blue">
            <Activity :size="20" />
          </div>
          <div class="stat-info">
            <span class="label">平均响应延迟</span>
            <div class="val">{{ userStore.usage.averageLatencyMs.toLocaleString() }} <span class="unit">ms</span></div>
            <span class="subtext">基于今日生图调用</span>
          </div>
        </div>
      </div>

      <section class="api-section">
        <div class="section-title-row">
          <div>
            <h2>生图调用方</h2>
            <p>配置 OpenAI 兼容服务，并选择当前生图调用方</p>
          </div>
          <button class="create-key-btn" type="button" @click="isCreatingProvider = true">
            <Plus :size="16" />
            添加调用方
          </button>
        </div>

        <div v-if="isCreatingProvider" class="create-key-box">
          <div class="input-row">
            <input v-model="providerName" placeholder="调用方名称" />
            <input v-model="providerBaseUrl" placeholder="https://api.openai.com" />
          </div>
          <input v-model="providerApiKey" type="password" placeholder="API Key" />
          <p v-if="userStore.operationError" class="form-error">{{ userStore.operationError }}</p>
          <div class="actions">
            <button class="confirm" type="button" @click="handleCreateProvider">保存</button>
            <button class="cancel" type="button" @click="isCreatingProvider = false">取消</button>
          </div>
        </div>

        <div class="provider-list">
          <div v-for="provider in userStore.providers" :key="provider.id" class="provider-row">
            <div>
              <div class="key-name">
                <Activity :size="16" />
                <span>{{ provider.name }}</span>
                <span v-if="provider.isActive" class="key-status-badge active">当前调用方</span>
              </div>
              <div class="provider-meta">
                <code>{{ provider.baseUrl }}</code>
                <span>{{ provider.model }}</span>
                <span>{{ provider.maskedApiKey }}</span>
                <span v-if="provider.needsRotation" class="key-status-badge revoked">请重新配置凭证</span>
              </div>
            </div>
            <div class="key-actions">
              <button
                v-if="!provider.isActive"
                class="create-key-btn compact"
                type="button"
                @click="handleActivateProvider(provider.id)"
              >
                启用
              </button>
              <button class="icon-btn danger" type="button" title="删除调用方" @click="handleDeleteProvider(provider.id)">
                <Trash2 :size="15" />
              </button>
            </div>
          </div>
          <p v-if="userStore.providers.length === 0" class="empty-state">暂无调用方</p>
        </div>
      </section>

      <!-- Quick Start Snippet Card -->
      <section class="api-section">
        <div class="section-title-row">
          <h2>快速集成 (SDK & Code Snippets)</h2>
          <p>兼容 OpenAI 官方 SDK 规约，支持零门槛无缝平替</p>
        </div>

        <div class="code-card">
          <div class="code-header">
            <div class="tabs">
              <button :class="{ active: activeCodeLang === 'curl' }" @click="activeCodeLang = 'curl'">cURL</button>
              <button :class="{ active: activeCodeLang === 'python' }" @click="activeCodeLang = 'python'">Python</button>
              <button :class="{ active: activeCodeLang === 'node' }" @click="activeCodeLang = 'node'">Node.js</button>
              <button :class="{ active: activeCodeLang === 'go' }" @click="activeCodeLang = 'go'">Go</button>
            </div>
            <button class="copy-code-btn" type="button" @click="copyText(codeSnippets[activeCodeLang])">
              <Check v-if="copiedText === codeSnippets[activeCodeLang]" :size="14" />
              <Copy v-else :size="14" />
              <span>{{ copiedText === codeSnippets[activeCodeLang] ? '已复制' : 'Copy' }}</span>
            </button>
          </div>
          <pre class="code-block"><code>{{ codeSnippets[activeCodeLang] }}</code></pre>
        </div>
      </section>
    </div>

    <!-- TAB 2: API 密钥 (API Keys) -->
    <div v-if="activeSubNav === 'keys'" class="tab-content">
      <section class="api-section">
        <div class="section-title-row">
          <div>
            <h2>API 密钥管理 (API Keys)</h2>
            <p>请妥善保管您的 API 密钥，不要将私钥暴露在公开客户端代码中</p>
          </div>
          <button class="create-key-btn" type="button" @click="isCreatingKey = true">
            <Plus :size="16" />
            生成新密钥
          </button>
        </div>

        <!-- Create Key Modal -->
        <div v-if="isCreatingKey" class="create-key-box">
          <div class="input-row">
            <input v-model="newKeyName" placeholder="输入密钥名称 (例如: Production Backend)" />
            <select v-model="newKeyScope" class="scope-select">
              <option value="full">完全访问权限 (Full Access)</option>
              <option value="generate">生图专属权限 (Generation Only)</option>
              <option value="read">只读权限 (Read Only)</option>
            </select>
          </div>
          <div class="actions">
            <button class="confirm" type="button" @click="handleCreateKey">确认生成</button>
            <button class="cancel" type="button" @click="isCreatingKey = false">取消</button>
          </div>
          <p v-if="userStore.operationError" class="form-error">{{ userStore.operationError }}</p>
        </div>

        <div v-if="userStore.oneTimeApiKey" class="create-key-box one-time-key-box">
          <strong>新密钥仅显示一次</strong>
          <div class="dark-code-row">
            <code>{{ userStore.oneTimeApiKey }}</code>
            <button class="copy-spec-btn" type="button" @click="copyText(userStore.oneTimeApiKey, 'new-key')">
              <Check v-if="copiedKeyId === 'new-key'" :size="13" />
              <Copy v-else :size="13" />
              <span>{{ copiedKeyId === 'new-key' ? '已复制' : '复制' }}</span>
            </button>
          </div>
          <button class="cancel" type="button" @click="userStore.clearOneTimeApiKey">关闭</button>
        </div>

        <div class="key-list">
          <div v-for="keyItem in userStore.apiKeys" :key="keyItem.id" class="key-card">
            <div class="key-main">
              <div class="key-name">
                <Key :size="16" />
                <span>{{ keyItem.name }}</span>
                <span class="key-status-badge" :class="keyItem.status">
                  {{ keyItem.status === 'active' ? '激活中' : '已废弃' }}
                </span>
              </div>
              <div class="key-value-row">
                <code class="key-value">{{ keyItem.maskedKey }}</code>
                <span v-if="keyItem.needsRotation" class="key-status-badge revoked">请轮换旧密钥</span>
              </div>
            </div>
            <div class="key-meta">
              <span>创建时间: {{ keyItem.createdAt }}</span>
              <span>最后调用: {{ keyItem.lastUsed }}</span>
              <div class="key-actions">
                <button
                  v-if="keyItem.status === 'active'"
                  class="icon-btn danger"
                  type="button"
                  title="废弃密钥"
                  @click="userStore.revokeApiKey(keyItem.id)"
                >
                  <Trash2 :size="15" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- TAB 3: 调用记录 (Usage Logs) -->
    <div v-if="activeSubNav === 'logs'" class="tab-content">
      <section class="api-section">
        <div class="section-title-row">
          <div>
            <h2>调用记录与用量统计</h2>
            <p>查看近 30 天的 API 请求日志及扣费记录</p>
          </div>
        </div>

        <table class="doc-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>Endpoint</th>
              <th>模型</th>
              <th>状态</th>
              <th>耗时</th>
              <th>扣除积分</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in userStore.usage.items" :key="item.id">
              <td>{{ formatDateTime(item.createdAt) }}</td>
              <td><code>{{ item.endpoint }}</code></td>
              <td>{{ item.model }}</td>
              <td><span class="req-badge" :class="{ no: item.status === 'success' }">{{ item.status === 'success' ? '成功' : '失败' }}</span></td>
              <td>{{ item.durationMs.toLocaleString() }}ms</td>
              <td>{{ item.creditsUsed }} 积分</td>
            </tr>
            <tr v-if="userStore.usage.items.length === 0"><td colspan="6" class="empty-state">暂无调用记录</td></tr>
          </tbody>
        </table>
      </section>
    </div>

    <!-- TAB 4: 接口文档 (API Reference) 1:1 Matched with rova.chat/developer -->
    <div v-if="activeSubNav === 'docs'" class="tab-content docs-container">
      <!-- 概述 (Overview) -->
      <section class="doc-block">
        <h2 class="doc-title">概述</h2>
        <p class="doc-intro">
          Lumora Image Studio 提供 RESTful API，允许第三方应用通过 API Key 调用图像生成和编辑服务。提供同步和异步两种模式。
        </p>

        <div class="spec-card">
          <span class="spec-label">Base URL</span>
          <div class="dark-code-row">
            <code>{{ docsBaseUrl }}</code>
            <button
              class="copy-spec-btn"
              type="button"
              @click="copyText(docsBaseUrl)"
            >
              <Check v-if="copiedText === docsBaseUrl" :size="13" />
              <Copy v-else :size="13" />
              <span>{{ copiedText === docsBaseUrl ? 'Copied' : 'Copy' }}</span>
            </button>
          </div>
        </div>

        <div class="spec-card">
          <span class="spec-label">认证方式</span>
          <div class="dark-code-row">
            <code>Authorization: Bearer lum-live-xxxxxxxx</code>
            <button
              class="copy-spec-btn"
              type="button"
              @click="copyText('Authorization: Bearer lum-live-xxxxxxxx')"
            >
              <Check v-if="copiedText === 'Authorization: Bearer lum-live-xxxxxxxx'" :size="13" />
              <Copy v-else :size="13" />
              <span>{{ copiedText === 'Authorization: Bearer lum-live-xxxxxxxx' ? 'Copied' : 'Copy' }}</span>
            </button>
          </div>
        </div>
      </section>

      <!-- 计费说明 (Billing) -->
      <section class="doc-block">
        <h2 class="doc-title">计费说明</h2>
        <p class="doc-intro">API 调用按积分计费，不同等级用户每张图消耗不同积分：</p>

        <table class="rova-table">
          <thead>
            <tr>
              <th>计划</th>
              <th>每张图消耗</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Free / Pro</td>
              <td>1 积分</td>
              <td>默认费率</td>
            </tr>
          </tbody>
        </table>

        <p class="billing-note">
          批量生成时按实际成功数量计费。如生成 4 张但只成功 3 张，则只扣 3 张的费用。
        </p>
      </section>

      <!-- 同步接口 (Synchronous API) -->
      <section class="doc-block">
        <h2 class="doc-title">同步接口</h2>
        <p class="doc-intro">请求后等待生成完成再返回结果，通常 30-120 秒。适合简单集成。</p>

        <div class="endpoint-section">
          <div class="endpoint-header">
            <span class="ep-method">POST</span>
            <span class="ep-path">/v1/images/generations</span>
          </div>
          <p class="ep-desc-text">文生图：提交文本描述，返回标准 b64_json 图片数据。</p>

          <h3 class="sub-heading">请求参数</h3>
          <div class="table-scroll">
            <table class="rova-table">
              <thead><tr><th>参数</th><th>类型</th><th>必填</th><th>说明</th></tr></thead>
              <tbody>
                <tr><td><code>prompt</code></td><td>string</td><td>✓</td><td>图像描述文本</td></tr>
                <tr><td><code>n</code></td><td>integer</td><td>-</td><td>生成数量 (1-4)，默认 1</td></tr>
                <tr><td><code>size</code></td><td>string</td><td>-</td><td>auto 或宽x高尺寸，边长不超过 3840</td></tr>
                <tr><td><code>quality</code></td><td>string</td><td>-</td><td>auto、low、medium 或 high</td></tr>
                <tr><td><code>output_format</code></td><td>string</td><td>-</td><td>png、jpeg 或 webp</td></tr>
                <tr><td><code>model</code></td><td>string</td><td>-</td><td>模型名称，默认 gpt-image-2</td></tr>
              </tbody>
            </table>
          </div>

          <h3 class="sub-heading">响应示例</h3>
          <CopyCodeBlock :code="docsCode.generationResponse" />
        </div>

        <div class="endpoint-section">
          <div class="endpoint-header">
            <span class="ep-method">POST</span>
            <span class="ep-path">/v1/images/edits</span>
          </div>
          <p class="ep-desc-text">图生图：上传参考图片 + 编辑指令。支持 multipart 文件或 JSON data URL/base64，不抓取远程 URL。</p>

          <div class="doc-callout">
            <div><Zap :size="15" aria-hidden="true" /><strong>多参考图 vs 批量编辑</strong></div>
            <ul>
              <li><strong>多参考图：</strong>一次请求上传多张图，所有图作为参考上下文，生成 1 张结果。消耗 1 积分。</li>
              <li><strong>批量编辑：</strong>对多张图分别独立执行相同编辑，每张图各生成 1 个结果。需为每张图发送独立请求，每张消耗 1 积分。</li>
            </ul>
          </div>

          <h3 class="sub-heading">方式一：multipart/form-data（上传文件）</h3>
          <div class="table-scroll">
            <table class="rova-table">
              <thead><tr><th>参数</th><th>类型</th><th>必填</th><th>说明</th></tr></thead>
              <tbody>
                <tr><td><code>prompt</code></td><td>string</td><td>✓</td><td>编辑指令</td></tr>
                <tr><td><code>image</code></td><td>file</td><td>✓</td><td>参考图片，可多次传入多张 (1-4 张)</td></tr>
                <tr><td><code>model</code></td><td>string</td><td>-</td><td>模型名称，默认 gpt-image-2</td></tr>
                <tr><td><code>n</code></td><td>integer</td><td>-</td><td>生成数量 (1-4)，默认 1</td></tr>
                <tr><td><code>size</code></td><td>string</td><td>-</td><td>auto 或宽x高输出尺寸</td></tr>
                <tr><td><code>quality</code></td><td>string</td><td>-</td><td>auto、low、medium 或 high</td></tr>
                <tr><td><code>output_format</code></td><td>string</td><td>-</td><td>png、jpeg 或 webp</td></tr>
                <tr><td><code>mask</code></td><td>file</td><td>-</td><td>蒙版图片（透明区域=编辑区域）</td></tr>
              </tbody>
            </table>
          </div>

          <h3 class="sub-heading">方式二：application/json（data URL 或 base64）</h3>
          <div class="table-scroll">
            <table class="rova-table">
              <thead><tr><th>参数</th><th>类型</th><th>必填</th><th>说明</th></tr></thead>
              <tbody>
                <tr><td><code>prompt</code></td><td>string</td><td>✓</td><td>编辑指令</td></tr>
                <tr><td><code>images</code></td><td>array</td><td>✓</td><td>参考图片数组，见下方格式说明</td></tr>
                <tr><td><code>model</code></td><td>string</td><td>-</td><td>模型名称，默认 gpt-image-2</td></tr>
                <tr><td><code>n</code></td><td>integer</td><td>-</td><td>生成数量 (1-4)，默认 1</td></tr>
                <tr><td><code>size</code></td><td>string</td><td>-</td><td>输出尺寸</td></tr>
                <tr><td><code>quality</code></td><td>string</td><td>-</td><td>auto、low、medium 或 high</td></tr>
                <tr><td><code>output_format</code></td><td>string</td><td>-</td><td>png、jpeg 或 webp</td></tr>
              </tbody>
            </table>
          </div>

          <h3 class="sub-heading">images 数组支持的格式</h3>
          <CopyCodeBlock :code="docsCode.imageFormats" />
          <h3 class="sub-heading">示例：单张参考图 (curl multipart)</h3>
          <CopyCodeBlock :code="docsCode.editSingleCurl" />
          <h3 class="sub-heading">示例：多张参考图 → 1张结果 (curl multipart)</h3>
          <CopyCodeBlock :code="docsCode.editMultiCurl" />
          <h3 class="sub-heading">示例：多张参考图 → 1张结果 (JSON + base64)</h3>
          <CopyCodeBlock :code="docsCode.editJsonCurl" />
          <h3 class="sub-heading">示例：JavaScript 多参考图 → 1张结果</h3>
          <CopyCodeBlock :code="docsCode.editJavaScript" />
          <h3 class="sub-heading">示例：Python 多参考图 → 1张结果</h3>
          <CopyCodeBlock :code="docsCode.editPython" />
          <h3 class="sub-heading">响应</h3>
          <CopyCodeBlock :code="docsCode.editResponse" />
        </div>
      </section>

      <!-- 异步接口 (Async API) -->
      <section class="doc-block">
        <h2 class="doc-title">异步接口</h2>
        <p class="doc-intro">立即返回 taskId，由客户端轮询任务状态。适合高并发场景，避免长连接超时。</p>

        <div class="endpoint-section">
          <div class="endpoint-header">
            <span class="ep-method">POST</span>
            <span class="ep-path">/v1/images/generations/async</span>
          </div>
          <p class="ep-desc-text">异步文生图：参数与同步接口相同，立即返回 taskId。</p>
          <h3 class="sub-heading">请求参数</h3>
          <p class="ep-desc-text">与 POST /v1/images/generations 完全相同</p>
          <h3 class="sub-heading">响应</h3>
          <CopyCodeBlock :code="docsCode.asyncGenerationResponse" />
        </div>

        <div class="endpoint-section">
          <div class="endpoint-header">
            <span class="ep-method">POST</span>
            <span class="ep-path">/v1/images/edits/async</span>
          </div>
          <p class="ep-desc-text">异步图生图：参数与同步 /v1/images/edits 完全相同，支持 multipart 和 JSON 两种格式，立即返回 taskId。</p>
          <h3 class="sub-heading">示例：异步多图编辑 (curl)</h3>
          <CopyCodeBlock :code="docsCode.asyncEditCurl" />
          <h3 class="sub-heading">示例：异步 JSON 多图编辑</h3>
          <CopyCodeBlock :code="docsCode.asyncEditJsonCurl" />
          <h3 class="sub-heading">响应</h3>
          <CopyCodeBlock :code="docsCode.asyncEditResponse" />
        </div>

        <div class="endpoint-section">
          <div class="endpoint-header">
            <span class="ep-method get">GET</span>
            <span class="ep-path">/v1/tasks/:id</span>
          </div>
          <p class="ep-desc-text">查询任务状态。支持逗号分隔的多个 ID：<code>/v1/tasks/id1,id2,id3</code></p>
          <h3 class="sub-heading">响应</h3>
          <CopyCodeBlock :code="docsCode.taskStatusResponse" />
          <p class="status-values"><code>status</code> 可选值: queued, running, success, error</p>
        </div>

        <div class="endpoint-section">
          <div class="endpoint-header">
            <span class="ep-method">POST</span>
            <span class="ep-path">/v1/tasks/confirm</span>
          </div>
          <p class="ep-desc-text">任务成功时自动扣费、失败时自动退款；确认接口幂等汇总结果。</p>
          <h3 class="sub-heading">请求参数</h3>
          <CopyCodeBlock :code="docsCode.confirmRequest" />
          <h3 class="sub-heading">响应</h3>
          <CopyCodeBlock :code="docsCode.confirmResponse" />
        </div>
      </section>

      <!-- 在线交互调试 Playground -->
      <section class="doc-block">
        <h2 class="doc-title">账户接口</h2>

        <div class="endpoint-section">
          <div class="endpoint-header">
            <span class="ep-method get">GET</span>
            <span class="ep-path">/v1/account/credits</span>
          </div>
          <p class="ep-desc-text">查询当前账户积分余额和计划信息。</p>
          <CopyCodeBlock :code="docsCode.creditsResponse" />
        </div>

        <div class="endpoint-section">
          <div class="endpoint-header">
            <span class="ep-method get">GET</span>
            <span class="ep-path">/v1/account/usage</span>
          </div>
          <p class="ep-desc-text">查询账户用量统计和最近调用记录。</p>
          <CopyCodeBlock :code="docsCode.usageResponse" />
        </div>
      </section>

      <section class="doc-block">
        <h2 class="doc-title">异步流程示例</h2>
        <h3 class="sub-heading first">推荐的异步调用流程</h3>
        <CopyCodeBlock :code="docsCode.asyncFlow" />
      </section>

      <section class="doc-block">
        <h2 class="doc-title">错误码</h2>
        <div class="table-scroll">
          <table class="rova-table">
            <thead><tr><th>HTTP</th><th>响应</th><th>说明</th></tr></thead>
            <tbody>
              <tr><td>400</td><td><code>invalid_request_error</code></td><td>请求参数错误</td></tr>
              <tr><td>401</td><td><code>authentication_error</code></td><td>API Key 无效</td></tr>
              <tr><td>403</td><td><code>permission_error</code></td><td>权限或积分不足</td></tr>
              <tr><td>429</td><td><code>rate_limit_error</code></td><td>达到每日限额</td></tr>
              <tr><td>502</td><td><code>api_error</code></td><td>上游生成失败</td></tr>
            </tbody>
          </table>
        </div>
        <CopyCodeBlock :code="docsCode.errorResponse" />
      </section>

      <section class="doc-block">
        <h2 class="doc-title">SDK 示例</h2>
        <h3 class="sub-heading first">JavaScript (文生图 同步)</h3>
        <CopyCodeBlock :code="docsCode.sdkGenerationJavaScript" />
        <h3 class="sub-heading">JavaScript (多参考图编辑)</h3>
        <CopyCodeBlock :code="docsCode.sdkMultiReferenceJavaScript" />
        <h3 class="sub-heading">JavaScript (批量编辑：每张图独立请求)</h3>
        <CopyCodeBlock :code="docsCode.sdkBatchEditJavaScript" />
        <h3 class="sub-heading">Python (异步模式 文生图)</h3>
        <CopyCodeBlock :code="docsCode.sdkAsyncPython" />
        <h3 class="sub-heading">Python (异步模式 多参考图编辑)</h3>
        <CopyCodeBlock :code="docsCode.sdkAsyncEditPython" />
        <h3 class="sub-heading">批量编辑：每张图独立编辑 (需多次调用)</h3>
        <CopyCodeBlock :code="docsCode.batchEditCurl" />
      </section>
    </div>
  </div>
</template>

<style scoped>
.api-view {
  width: min(960px, calc(100% - 64px));
  margin: 0 auto;
  padding: 80px 0 100px;
}

.api-header {
  margin-bottom: 40px;
  text-align: left;
}

.api-header h1 {
  margin: 0;
  color: #0f172a;
  font-size: 32px;
  font-weight: 700;
}

.api-header p {
  margin: 8px 0 24px;
  color: #64748b;
  font-size: 14px;
}

/* Tabs Matching rova.chat/developer */
.api-tabs-bar {
  display: flex;
  gap: 32px;
  border-bottom: 1px solid #e2e8f0;
}

.tab-item {
  position: relative;
  padding: 10px 0 14px;
  color: #64748b;
  font-size: 14px;
  font-weight: 550;
  cursor: pointer;
  background: transparent;
  border: 0;
  transition: color 150ms ease;
}

.tab-item:hover {
  color: #0f172a;
}

.tab-item.active {
  color: #0f172a;
  font-weight: 650;
}

.tab-item.active::after {
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  content: '';
  background: #0f172a;
  border-radius: 2px;
}

.tab-content {
  padding-top: 24px;
}

.docs-container {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.doc-block {
  display: flex;
  flex-direction: column;
}

.doc-title {
  margin: 0 0 12px;
  color: #0f172a;
  font-size: 20px;
  font-weight: 700;
}

.doc-intro {
  margin: 0 0 20px;
  color: #475569;
  font-size: 14px;
  line-height: 1.6;
}

.spec-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.spec-label {
  color: #64748b;
  font-size: 12px;
  font-weight: 500;
}

.dark-code-row {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: #0f172a;
  border-radius: 12px;
}

.dark-code-row code {
  color: #e2e8f0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
}

.copy-spec-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  color: #94a3b8;
  font-size: 11px;
  cursor: pointer;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  transition: all 150ms ease;
}

.copy-spec-btn:hover {
  color: #ffffff;
  background: #334155;
}

/* Rova.chat Clean Table Style */
.rova-table {
  width: 100%;
  margin-bottom: 16px;
  border-collapse: collapse;
  font-size: 13px;
}

.rova-table th,
.rova-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
  text-align: left;
}

.rova-table th {
  color: #64748b;
  font-weight: 600;
  background: #f8fafc;
}

.rova-table code {
  padding: 2px 6px;
  color: #0f172a;
  font-family: monospace;
  background: #f1f5f9;
  border-radius: 4px;
}

.billing-note {
  margin: 8px 0 0;
  color: #94a3b8;
  font-size: 12px;
}

.endpoint-section {
  min-width: 0;
}

.endpoint-section + .endpoint-section {
  padding-top: 32px;
  margin-top: 32px;
  border-top: 1px solid #e2e8f0;
}

.endpoint-header {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.ep-method {
  padding: 3px 8px;
  color: #16a34a;
  font-size: 11px;
  font-weight: 700;
  background: #dcfce7;
  border-radius: 4px;
}

.ep-method.get {
  color: #0284c7;
  background: #e0f2fe;
}

.ep-path {
  color: #0f172a;
  font-family: monospace;
  font-size: 16px;
  font-weight: 700;
}

.ep-desc-text {
  margin: 0 0 20px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.65;
}

.ep-desc-text code,
.status-values code {
  padding: 2px 6px;
  color: #0f172a;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  background: #f1f5f9;
  border-radius: 4px;
}

.sub-heading {
  margin: 20px 0 12px;
  color: #1e293b;
  font-size: 14px;
  font-weight: 650;
}

.sub-heading.first {
  margin-top: 0;
}

.table-scroll {
  width: 100%;
  overflow-x: auto;
}

.table-scroll .rova-table {
  min-width: 620px;
}

.doc-callout {
  padding: 16px 18px;
  margin: 0 0 20px;
  color: #475569;
  font-size: 13px;
  line-height: 1.65;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.doc-callout > div {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #0f172a;
}

.doc-callout ul {
  padding-left: 20px;
  margin: 10px 0 0;
}

.doc-callout li + li {
  margin-top: 6px;
}

.status-values {
  margin: 12px 0 0;
  color: #64748b;
  font-size: 12px;
}

.dark-response-box {
  position: relative;
  padding: 20px;
  background: #0f172a;
  border-radius: 12px;
}

.dark-response-box pre {
  margin: 0;
  color: #38bdf8;
  font-family: monospace;
  font-size: 13px;
  line-height: 1.6;
}

.copy-res-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  color: #94a3b8;
  font-size: 11px;
  cursor: pointer;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
}

/* Dashboard Stat Cards & Other Styles */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 36px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}

.stat-icon {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 12px;
}

.stat-icon.purple { color: #7c3aed; background: #f3e8ff; }
.stat-icon.green  { color: #16a34a; background: #dcfce7; }
.stat-icon.blue   { color: #0284c7; background: #e0f2fe; }

.stat-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.stat-info .label {
  color: #6b7280;
  font-size: 12px;
  font-weight: 500;
}

.stat-info .val {
  margin-top: 2px;
  font-size: 20px;
  font-weight: 700;
}

.stat-info .unit {
  color: #9ca3af;
  font-size: 13px;
  font-weight: 400;
}

.text-green { color: #16a34a; display: flex; align-items: center; gap: 6px; }

.status-dot {
  width: 8px;
  height: 8px;
  background: #22c55e;
  border-radius: 50%;
}

.subtext {
  margin-top: 4px;
  color: #9ca3af;
  font-size: 11px;
}

.progress-bar {
  height: 5px;
  margin-top: 8px;
  background: #f3f4f6;
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar .fill {
  height: 100%;
  background: #7c3aed;
  border-radius: 3px;
}

.api-section {
  padding: 28px;
  margin-bottom: 24px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.section-title-row h2,
.api-section h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 650;
}

.section-title-row p {
  margin: 4px 0 0;
  color: #6b7280;
  font-size: 13px;
}

.create-key-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: #18181b;
  border: 0;
  border-radius: 10px;
}

.create-key-btn.compact {
  padding: 7px 12px;
}

.create-key-box {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  margin-bottom: 20px;
  background: #fafafa;
  border: 1px solid #e4e4e7;
  border-radius: 16px;
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.input-row {
  display: flex;
  gap: 12px;
}

@media (max-width: 640px) {
  .input-row {
    flex-direction: column;
    gap: 12px;
  }
}

.input-row input,
.create-key-box > input,
.scope-select {
  height: 42px;
  padding: 0 16px;
  font-size: 14px;
  font-family: inherit;
  color: #18181b;
  background: #ffffff;
  border: 1px solid #e4e4e7;
  border-radius: 10px;
  outline: none;
  box-sizing: border-box;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.input-row input {
  flex: 1;
}

.scope-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  background-size: 16px;
  padding-right: 40px;
  cursor: pointer;
}

.input-row input:hover,
.create-key-box > input:hover,
.scope-select:hover {
  border-color: #a1a1aa;
}

.input-row input:focus,
.create-key-box > input:focus,
.scope-select:focus {
  border-color: #7c3aed;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.12);
}

.input-row input::placeholder,
.create-key-box > input::placeholder {
  color: #a1a1aa;
}

.create-key-box .actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.create-key-box button {
  height: 40px;
  padding: 0 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border-radius: 10px;
  box-sizing: border-box;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.create-key-box .confirm {
  color: #ffffff;
  background: #7c3aed;
  border: 0;
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.15);
}

.create-key-box .confirm:hover {
  background: #6d28d9;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(124, 58, 237, 0.25);
}

.create-key-box .confirm:active {
  transform: translateY(0);
}

.create-key-box .cancel {
  color: #71717a;
  background: #f4f4f5;
  border: 1px solid #e4e4e7;
}

.create-key-box .cancel:hover {
  color: #18181b;
  background: #e4e4e7;
  border-color: #d4d4d8;
}

.form-error {
  margin: 0;
  color: #dc2626;
  font-size: 12px;
}

.provider-list {
  display: flex;
  flex-direction: column;
}

.provider-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid #e5e7eb;
}

.provider-row:first-child {
  padding-top: 0;
}

.provider-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-top: 7px;
  color: #64748b;
  font-size: 12px;
}

.provider-meta code {
  overflow-wrap: anywhere;
}

.empty-state {
  padding: 24px;
  color: #94a3b8;
  text-align: center;
}

.key-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.key-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 12px;
}

.key-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
}

.key-status-badge {
  padding: 2px 6px;
  font-size: 10px;
  border-radius: 4px;
}

.key-status-badge.active { color: #15803d; background: #dcfce7; }
.key-status-badge.revoked { color: #b91c1c; background: #fee2e2; }

.key-value-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.key-value {
  padding: 3px 8px;
  color: #334155;
  font-family: monospace;
  font-size: 12px;
  background: #e2e8f0;
  border-radius: 6px;
}

.eye-btn {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  color: #64748b;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.key-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  color: #94a3b8;
  font-size: 12px;
}

.key-actions {
  display: flex;
  gap: 6px;
}

.icon-btn {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  color: #475569;
  cursor: pointer;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
}

.icon-btn.danger { color: #ef4444; border-color: #fca5a5; }

.code-card {
  overflow: hidden;
  background: #0f172a;
  border-radius: 14px;
}

.code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  background: #1e293b;
  border-bottom: 1px solid #334155;
}

.tabs {
  display: flex;
  gap: 8px;
}

.tabs button {
  padding: 4px 12px;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 6px;
}

.tabs button.active {
  color: #ffffff;
  background: #334155;
}

.copy-code-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
  background: transparent;
  border: 1px solid #475569;
  border-radius: 6px;
}

.code-block {
  padding: 20px;
  margin: 0;
  color: #e2e8f0;
  font-family: monospace;
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
}

.doc-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.doc-table th,
.doc-table td {
  padding: 10px 14px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
}

.doc-table th {
  color: #64748b;
  font-weight: 600;
  background: #ffffff;
}

.doc-table code {
  padding: 2px 6px;
  color: #7c3aed;
  font-family: monospace;
  background: #f3e8ff;
  border-radius: 4px;
}

.req-badge {
  padding: 2px 6px;
  font-size: 10px;
  border-radius: 4px;
}

.req-badge.no { color: #16a34a; background: #dcfce7; }

/* API Playground (Try Out) */
.playground-box {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.playground-left,
.playground-right {
  display: flex;
  flex-direction: column;
  padding: 20px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.form-group label {
  color: #475569;
  font-size: 12px;
  font-weight: 600;
}

.disabled-input,
.form-group textarea,
.form-group select {
  padding: 8px 12px;
  font-size: 13px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
}

.disabled-input {
  color: #94a3b8;
  background: #f1f5f9;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.run-test-btn {
  display: inline-flex;
  height: 40px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: auto;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: #0f172a;
  border: 0;
  border-radius: 10px;
}

.res-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
}

.latency-badge {
  color: #16a34a;
  font-size: 11px;
}

.res-block {
  flex: 1;
  padding: 14px;
  margin: 0;
  color: #38bdf8;
  font-family: monospace;
  font-size: 12px;
  background: #0f172a;
  border-radius: 10px;
  overflow-y: auto;
}

.res-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 13px;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 720px) {
  .api-view { width: calc(100% - 32px); padding: 48px 0 72px; }
  .api-tabs-bar { gap: 24px; overflow-x: auto; white-space: nowrap; }
  .endpoint-header { max-width: 100%; flex-wrap: wrap; }
  .ep-path { max-width: 100%; overflow-wrap: anywhere; }
  .dark-code-row { align-items: flex-start; gap: 12px; }
  .dark-code-row code { min-width: 0; overflow-wrap: anywhere; }
  .copy-spec-btn { flex: 0 0 auto; }
}

@media (max-width: 860px) {
  .dashboard-grid { grid-template-columns: 1fr; }
  .playground-box { grid-template-columns: 1fr; }
  .key-card { flex-direction: column; align-items: flex-start; gap: 10px; }
  .key-meta { width: 100%; justify-content: space-between; }
}
</style>
