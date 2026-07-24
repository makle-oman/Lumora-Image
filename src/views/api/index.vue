<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Activity,
  Check,
  Code2,
  Copy,
  Eye,
  EyeOff,
  Key,
  Plus,
  Play,
  ShieldCheck,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-vue-next'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()
const copiedKeyId = ref('')
const copiedText = ref('')
const activeSubNav = ref<'overview' | 'keys' | 'logs' | 'docs'>('docs')
const activeCodeLang = ref<'curl' | 'python' | 'node' | 'go'>('curl')

// Key creation & visibility state
const isCreatingKey = ref(false)
const newKeyName = ref('')
const newKeyScope = ref<'full' | 'read' | 'generate'>('full')
const revealedKeyIds = ref<Set<string>>(new Set())

// Interactive Try-It-Out State
const tryoutPrompt = ref('奢华护肤品微缩施工现场，商业产品摄影，超写实 CGI')
const tryoutModel = ref('gpt-image-2')
const tryoutSize = ref('1024x1024')
const isTestingApi = ref(false)
const tryoutResponse = ref<string | null>(null)
const tryoutLatency = ref<number | null>(null)

function toggleKeyVisibility(id: string): void {
  if (revealedKeyIds.value.has(id)) {
    revealedKeyIds.value.delete(id)
  } else {
    revealedKeyIds.value.add(id)
  }
}

function getMaskedKey(keyStr: string, id: string): string {
  if (revealedKeyIds.value.has(id)) return keyStr
  if (keyStr.length <= 12) return 'sk-img-••••••••••••••••'
  return `${keyStr.slice(0, 7)}••••••••••••${keyStr.slice(-4)}`
}

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

function handleCreateKey(): void {
  if (!newKeyName.value.trim()) return
  userStore.createApiKey(newKeyName.value.trim())
  newKeyName.value = ''
  isCreatingKey.value = false
}

async function runApiTest(): Promise<void> {
  isTestingApi.value = true
  tryoutResponse.value = null
  const startTime = Date.now()

  await new Promise(resolve => setTimeout(resolve, 850))

  const latency = Date.now() - startTime
  tryoutLatency.value = latency
  tryoutResponse.value = JSON.stringify(
    {
      data: [
        {
          url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
        },
      ],
      creditsUsed: 1,
      model: tryoutModel.value,
    },
    null,
    2,
  )
  isTestingApi.value = false
}

const currentApiKey = computed(() => {
  const activeKeys = userStore.apiKeys.filter(k => k.status === 'active')
  return activeKeys.length ? activeKeys[0].key : 'sk-img-xxxxxxxxx'
})

const sampleResponseJson = `{
  "data": [
    {
      "url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe"
    }
  ],
  "creditsUsed": 1,
  "model": "gpt-image-2"
}`

const codeSnippets = computed(() => ({
  curl: `curl https://api.lumora.ai/v1/images/generations \\
  -H "Authorization: Bearer ${currentApiKey.value}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-image-2",
    "prompt": "奢华护肤品微缩施工现场，商业产品摄影，超写实 CGI",
    "size": "1024x1024",
    "n": 1
  }'`,

  python: `import openai

client = openai.OpenAI(
    api_key="${currentApiKey.value}",
    base_url="https://api.lumora.ai/v1"
)

response = client.images.generate(
    model="gpt-image-2",
    prompt="一只在咖啡杯旁边打盹的橘猫，柔和自然光，写实风格摄影",
    size="1024x1024",
    n=1
)

print(response.data[0].url)`,

  node: `import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: '${currentApiKey.value}',
  baseURL: 'https://api.lumora.ai/v1',
});

async function main() {
  const image = await openai.images.generate({
    model: 'gpt-image-2',
    prompt: '赛博朋克霓虹雨夜，高科技悬浮飞行器，8k 极简渲染',
    size: '1024x1024',
  });

  console.log(image.data[0].url);
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
	url := "https://api.lumora.ai/v1/images/generations"
	payload := map[string]interface{}{
		"model":  "gpt-image-2",
		"prompt": "3D 抽象流体水晶雕塑，极简主义，绚丽光谱折射光影",
		"size":   "1024x1024",
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(body))
	req.Header.Set("Authorization", "Bearer ${currentApiKey.value}")
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
            <div class="val">8,420 <span class="unit">/ 10,000</span></div>
            <div class="progress-bar">
              <div class="fill" style="width: 84.2%;" />
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon green">
            <ShieldCheck :size="20" />
          </div>
          <div class="stat-info">
            <span class="label">API 服务状态</span>
            <div class="val text-green">
              <span class="status-dot" /> 运行正常
            </div>
            <span class="subtext">支持 99.99% SLA 保障</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon blue">
            <Activity :size="20" />
          </div>
          <div class="stat-info">
            <span class="label">平均响应延迟</span>
            <div class="val">138 <span class="unit">ms</span></div>
            <span class="subtext">基于全球边缘 GPU 节点</span>
          </div>
        </div>
      </div>

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
                <code class="key-value">{{ getMaskedKey(keyItem.key, keyItem.id) }}</code>
                <button
                  class="eye-btn"
                  type="button"
                  :title="revealedKeyIds.has(keyItem.id) ? '隐藏密钥' : '明文显示'"
                  @click="toggleKeyVisibility(keyItem.id)"
                >
                  <EyeOff v-if="revealedKeyIds.has(keyItem.id)" :size="14" />
                  <Eye v-else :size="14" />
                </button>
              </div>
            </div>
            <div class="key-meta">
              <span>创建时间: {{ keyItem.createdAt }}</span>
              <span>最后调用: {{ keyItem.lastUsed }}</span>
              <div class="key-actions">
                <button
                  class="icon-btn"
                  type="button"
                  title="复制密钥"
                  @click="copyText(keyItem.key, keyItem.id)"
                >
                  <Check v-if="copiedKeyId === keyItem.id" :size="15" />
                  <Copy v-else :size="15" />
                </button>
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
            <tr>
              <td>2026-07-24 14:28:10</td>
              <td><code>POST /v1/images/generations</code></td>
              <td>gpt-image-2</td>
              <td><span class="req-badge no">200 OK</span></td>
              <td>420ms</td>
              <td>1 积分</td>
            </tr>
            <tr>
              <td>2026-07-24 14:15:02</td>
              <td><code>POST /v1/images/generations</code></td>
              <td>banana2</td>
              <td><span class="req-badge no">200 OK</span></td>
              <td>680ms</td>
              <td>1 积分</td>
            </tr>
            <tr>
              <td>2026-07-24 13:40:22</td>
              <td><code>GET /v1/models</code></td>
              <td>-</td>
              <td><span class="req-badge no">200 OK</span></td>
              <td>45ms</td>
              <td>0 积分</td>
            </tr>
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
            <code>https://api.lumora.ai/v1</code>
            <button
              class="copy-spec-btn"
              type="button"
              @click="copyText('https://api.lumora.ai/v1')"
            >
              <Check v-if="copiedText === 'https://api.lumora.ai/v1'" :size="13" />
              <Copy v-else :size="13" />
              <span>{{ copiedText === 'https://api.lumora.ai/v1' ? 'Copied' : 'Copy' }}</span>
            </button>
          </div>
        </div>

        <div class="spec-card">
          <span class="spec-label">认证方式</span>
          <div class="dark-code-row">
            <code>Authorization: Bearer sk-img-xxxxxxxx</code>
            <button
              class="copy-spec-btn"
              type="button"
              @click="copyText('Authorization: Bearer sk-img-xxxxxxxx')"
            >
              <Check v-if="copiedText === 'Authorization: Bearer sk-img-xxxxxxxx'" :size="13" />
              <Copy v-else :size="13" />
              <span>{{ copiedText === 'Authorization: Bearer sk-img-xxxxxxxx' ? 'Copied' : 'Copy' }}</span>
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
            <tr>
              <td>Partner</td>
              <td>0.5 积分</td>
              <td>优享伙伴半价</td>
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

        <div class="endpoint-header">
          <span class="ep-method">POST</span>
          <span class="ep-path">/v1/images/generations</span>
        </div>

        <p class="ep-desc-text">文生图：提交文本描述，返回生成的图片 URL。</p>

        <h3 class="sub-heading">请求参数</h3>
        <table class="rova-table">
          <thead>
            <tr>
              <th>参数</th>
              <th>类型</th>
              <th>必填</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>prompt</code></td>
              <td>string</td>
              <td>✓</td>
              <td>图像描述文本</td>
            </tr>
            <tr>
              <td><code>n</code></td>
              <td>integer</td>
              <td>-</td>
              <td>生成数量 (1-4)，默认 1</td>
            </tr>
            <tr>
              <td><code>size</code></td>
              <td>string</td>
              <td>-</td>
              <td>尺寸: 1024x1024, 1024x1792, 1792x1024</td>
            </tr>
            <tr>
              <td><code>model</code></td>
              <td>string</td>
              <td>-</td>
              <td>模型名称，默认 gpt-image-2</td>
            </tr>
          </tbody>
        </table>

        <h3 class="sub-heading">响应示例</h3>
        <div class="dark-response-box">
          <button
            class="copy-res-btn"
            type="button"
            @click="copyText(sampleResponseJson)"
          >
            <Check v-if="copiedText === sampleResponseJson" :size="13" />
            <Copy v-else :size="13" />
            <span>{{ copiedText === sampleResponseJson ? 'Copied' : 'Copy' }}</span>
          </button>
          <pre><code>{{ sampleResponseJson }}</code></pre>
        </div>
      </section>

      <!-- 异步接口 (Async API) -->
      <section class="doc-block">
        <h2 class="doc-title">异步接口</h2>
        <p class="doc-intro">提交后台生成任务，立即返回 task_id，随后可轮询状态。</p>

        <div class="endpoint-header">
          <span class="ep-method">POST</span>
          <span class="ep-path">/v1/images/generations/async</span>
        </div>
        <p class="ep-desc-text">提交异步生成任务，返回 task_id 与状态。</p>

        <div class="endpoint-header" style="margin-top: 24px;">
          <span class="ep-method get">GET</span>
          <span class="ep-path">/v1/tasks/{id}</span>
        </div>
        <p class="ep-desc-text">查询异步任务状态与生成结果（状态：queued, processing, succeeded, failed）。</p>
      </section>

      <!-- 在线交互调试 Playground -->
      <section class="doc-block">
        <h2 class="doc-title">在线接口调试 (API Playground)</h2>
        <div class="playground-box">
          <div class="playground-left">
            <div class="form-group">
              <label>当前 API Key</label>
              <input :value="currentApiKey" disabled class="disabled-input" />
            </div>

            <div class="form-group">
              <label>提示词 (Prompt)</label>
              <textarea v-model="tryoutPrompt" rows="3" placeholder="输入生图提示词..." />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>渲染模型</label>
                <select v-model="tryoutModel">
                  <option value="gpt-image-2">gpt-image-2 (标准版)</option>
                  <option value="banana2">banana2 (超精版)</option>
                </select>
              </div>
              <div class="form-group">
                <label>分辨率</label>
                <select v-model="tryoutSize">
                  <option value="1024x1024">1024x1024 (1:1)</option>
                  <option value="1024x1792">1024x1792 (9:16)</option>
                  <option value="1792x1024">1792x1024 (16:9)</option>
                </select>
              </div>
            </div>

            <button
              class="run-test-btn"
              :disabled="isTestingApi"
              type="button"
              @click="runApiTest"
            >
              <Play v-if="!isTestingApi" :size="16" />
              <Sparkles v-else class="spin-icon" :size="16" />
              <span>{{ isTestingApi ? '发送请求中...' : '发送测试请求 (Send Request)' }}</span>
            </button>
          </div>

          <div class="playground-right">
            <div class="res-header">
              <span>Response JSON Body</span>
              <span v-if="tryoutLatency" class="latency-badge">
                ⏱️ 耗时: {{ tryoutLatency }}ms
              </span>
            </div>

            <pre v-if="tryoutResponse" class="res-block"><code>{{ tryoutResponse }}</code></pre>
            <div v-else class="res-placeholder">
              <Code2 :size="32" />
              <p>点击左侧“发送测试请求”按钮查看结果</p>
            </div>
          </div>
        </div>
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
}

.sub-heading {
  margin: 20px 0 12px;
  color: #1e293b;
  font-size: 14px;
  font-weight: 650;
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

.create-key-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  margin-bottom: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
}

.input-row {
  display: flex;
  gap: 12px;
}

.input-row input {
  flex: 1;
  padding: 0 14px;
  font-size: 13px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  outline: none;
}

.scope-select {
  padding: 0 12px;
  font-size: 13px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
}

.create-key-box .actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.create-key-box button {
  height: 34px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px;
}

.create-key-box .confirm { color: #ffffff; background: #7c3aed; border: 0; }
.create-key-box .cancel { color: #64748b; background: #e2e8f0; border: 0; }

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

@media (max-width: 860px) {
  .dashboard-grid { grid-template-columns: 1fr; }
  .playground-box { grid-template-columns: 1fr; }
  .key-card { flex-direction: column; align-items: flex-start; gap: 10px; }
  .key-meta { width: 100%; justify-content: space-between; }
}
</style>
