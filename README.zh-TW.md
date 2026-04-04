# GitHub Copilot Plugin for Claude Code

[English](README.md)

在 Claude Code 工作階段中使用 GitHub Copilot CLI 進行程式碼審查或委派任務。

本插件適用於希望在現有工作流程中輕鬆運用 GitHub Copilot 的 Claude Code 使用者。

## 來源與動機

本專案是從 [openai/codex-plugin-cc](https://github.com/openai/codex-plugin-cc) fork 後進行重構的版本，原專案是基於 OpenAI Codex CLI 所建構。

與上游專案的主要差異：

- **從 Codex 轉換為 GitHub Copilot** — 所有命令、代理、技能和腳本現在都以 GitHub Copilot CLI 為目標，取代原本的 Codex CLI。
- **模型無關架構** — 支援多種模型後端（Claude Opus 4.5、Claude Sonnet 4.5、GPT-5.2 Codex），不再綁定單一供應商。
- **恢復並擴展命令介面** — 恢復了 `--resume`/`--continue` 用於 session 管理，新增 `--autopilot` 用於自主連續執行，以及 `--share`/`--share-gist` 用於 session 匯出，搭配既有的 `--model` 和 `--background`/`--wait` API。
- **更新認證方式** — 使用 `COPILOT_GITHUB_TOKEN`、`GH_TOKEN` 或 `GITHUB_TOKEN` 進行彈性的 GitHub 認證，並自動支援已透過 GitHub CLI 登入的使用者（`gh auth token` fallback）。

## 功能概覽

- `/copilot:review` 執行一般的唯讀 Copilot 審查
- `/copilot:adversarial-review` 執行可導向的挑戰式審查
- `/copilot:rescue`、`/copilot:status`、`/copilot:result`、`/copilot:cancel` 委派任務並管理背景工作

## 需求

- **具有 Copilot 存取權限的 GitHub 帳號**
- **GitHub Copilot CLI** 全域安裝（`npm install -g @github/copilot`）
- **Node.js 22 或更新版本**
- **認證：** 設定 `COPILOT_GITHUB_TOKEN`、`GH_TOKEN` 或 `GITHUB_TOKEN` 其中一個環境變數，或直接使用 `gh auth login` 登入（插件會自動從 `gh auth token` 取得認證）

## 安裝

在 Claude Code 中加入 marketplace：

```bash
/plugin marketplace add chinlung/copilot-plugin-cc
```

安裝插件：

```bash
/plugin install copilot@chinlung-copilot-plugin-cc
```

重新載入插件：

```bash
/reload-plugins
```

然後執行：

```bash
/copilot:setup
```

`/copilot:setup` 會告知你 Copilot 是否就緒。如果 Copilot 未安裝且 npm 可用，它可以協助安裝。

如果你偏好手動安裝 Copilot：

```bash
npm install -g @github/copilot
```

安裝後，你應該會看到：

- 以下列出的斜線命令
- `/agents` 中的 `copilot:copilot-rescue` 子代理

一個簡單的首次測試：

```bash
/copilot:review --background
/copilot:status
/copilot:result
```

## 使用方式

### `/copilot:review`

對你目前的工作執行一般的 Copilot 審查。

> [!NOTE]
> 程式碼審查，特別是多檔案變更，可能需要一些時間。建議在背景執行。

適用情境：

- 審查你目前未提交的變更
- 審查你的分支與基準分支（如 `main`）的比較

使用 `--base <ref>` 進行分支審查。也支援 `--wait` 和 `--background`。此命令不可導向，也不接受自訂焦點文字。需要針對特定決策或風險區域進行挑戰時，請使用 [`/copilot:adversarial-review`](#copilotadversarial-review)。

範例：

```bash
/copilot:review
/copilot:review --base main
/copilot:review --background
```

此命令為唯讀，不會進行任何變更。在背景執行時，可使用 [`/copilot:status`](#copilotstatus) 檢查進度，使用 [`/copilot:cancel`](#copilotcancel) 取消正在進行的任務。

### `/copilot:adversarial-review`

執行一個**可導向的**審查，質疑所選的實作和設計。

可用於壓力測試假設、權衡取捨、失敗模式，以及是否有更安全或更簡單的替代方案。

使用與 `/copilot:review` 相同的審查目標選擇方式，包括用 `--base <ref>` 進行分支審查。也支援 `--wait` 和 `--background`。與 `/copilot:review` 不同的是，它可以在旗標之後接受額外的焦點文字。

適用情境：

- 上線前的審查，挑戰方向性而非僅程式碼細節
- 專注於設計選擇、權衡取捨、隱含假設和替代方案的審查
- 針對特定風險區域的壓力測試，如認證、資料遺失、回滾、競態條件或可靠性

範例：

```bash
/copilot:adversarial-review
/copilot:adversarial-review --base main challenge whether this was the right caching and retry design
/copilot:adversarial-review --background look for race conditions and question the chosen approach
```

此命令為唯讀，不會修復程式碼。

### `/copilot:rescue`

透過 `copilot:copilot-rescue` 子代理將任務交給 Copilot。

適用情境：

- 調查 bug
- 嘗試修復
- 實作功能或重構

> [!NOTE]
> 根據任務性質，這些任務可能需要很長時間，建議強制在背景執行或將代理移至背景。

支援 `--background`、`--wait`、`--model <model>`、`--resume <id>`、`--continue`、`--autopilot`、`--max-autopilot-continues <n>`、`--share <path>` 和 `--share-gist`。

範例：

```bash
/copilot:rescue investigate why the tests started failing
/copilot:rescue fix the failing test with the smallest safe patch
/copilot:rescue --background investigate the regression
/copilot:rescue --model claude-opus-4.5 refactor the auth module
/copilot:rescue --continue fix the remaining issues
/copilot:rescue --resume abc123 apply the suggested fix
/copilot:rescue --autopilot implement the full feature
/copilot:rescue --share /tmp/session.md investigate the regression
```

### `/copilot:status`

顯示目前儲存庫中正在執行和最近完成的 Copilot 工作。

範例：

```bash
/copilot:status
/copilot:status task-abc123
```

適用情境：

- 檢查背景工作的進度
- 查看最近完成的工作
- 確認任務是否仍在執行中

### `/copilot:result`

顯示已完成工作的最終 Copilot 輸出。

範例：

```bash
/copilot:result
/copilot:result task-abc123
```

### `/copilot:cancel`

取消正在執行的背景 Copilot 工作。

範例：

```bash
/copilot:cancel
/copilot:cancel task-abc123
```

### `/copilot:setup`

檢查 Copilot 是否已安裝並通過認證。
如果 Copilot 未安裝且 npm 可用，可以協助安裝。

範例：

```bash
/copilot:setup
```

#### 停止時審查閘門（Stop-Time Review Gate）

插件內建一個可選的**停止時審查閘門**，每當 Claude 停止回應時自動執行 Copilot 審查。如果上一輪回應包含程式碼變更且審查發現問題，閘門會阻止停止並要求你在結束 session 前修復問題。

審查閘門**預設為關閉**。可依 workspace 個別啟用或停用：

```bash
/copilot:setup --enable-review-gate
/copilot:setup --disable-review-gate
```

啟用後：

- 每當 Claude 完成一輪回應，stop hook 會啟動 Copilot 任務審查上一輪的回應內容。
- 如果上一輪只是狀態回報、setup 檢查或非編輯輸出，Copilot 會立即回傳 `ALLOW`。
- 如果上一輪有程式碼變更且 Copilot 發現阻塞性問題，會回傳 `BLOCK` 並附上原因，系統會提示你修復問題後再停止。
- 審查結果會記錄在插件的 `jobs/` 目錄中，方便事後查閱。

> [!NOTE]
> 審查閘門設定是依 workspace（基於 git 儲存庫根目錄）分別設定的。在一個專案中啟用不會影響其他專案。
