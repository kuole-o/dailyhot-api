import type { FC } from "hono/jsx";
import { html } from "hono/html";
import Layout from "./Layout.js";
import { config } from "../config.js";

const Home: FC = () => {
  return (
    <Layout title="API Collection" icon="data:image/x-icon;base64,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">
      <main className="home">
        <div className="img" style="opacity: 0.5;">
        <svg className="logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><path d="M392.8 1.2c-17-4.9-34.7 5-39.6 22l-128 448c-4.9 17 5 34.7 22 39.6s34.7-5 39.6-22l128-448c4.9-17-5-34.7-22-39.6zm80.6 120.1c-12.5 12.5-12.5 32.8 0 45.3L562.7 256l-89.4 89.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l112-112c12.5-12.5 12.5-32.8 0-45.3l-112-112c-12.5-12.5-32.8-12.5-45.3 0zm-306.7 0c-12.5-12.5-32.8-12.5-45.3 0l-112 112c-12.5 12.5-12.5 32.8 0 45.3l112 112c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L77.3 256l89.4-89.4c12.5-12.5 12.5-32.8 0-45.3z"/></svg>
        </div>
        <div className="title">
          <h1 className="title-text" style="font-size:2rem;">API Collection</h1>
        </div>
        <div className="terminal">
            <div className="toolbar">
              <div className="dot red"></div>
              <div className="dot yellow"></div>
              <div className="dot green"></div>
            </div>
            <div className="typewriterContent sueess">
              <pre id="terminal-output"></pre>
            </div>
          </div>
        <div className="control">
          <button id="all-button">
            <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
              <path fill="currentColor" d="M342.6 9.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l9.4 9.4L28.1 342.6C10.1 360.6 0 385 0 410.5V416c0 53 43 96 96 96h5.5c25.5 0 49.9-10.1 67.9-28.1L448 205.3l9.4 9.4c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-32-32-96-96-32-32zM205.3 256L352 109.3 402.7 160l-96 96H205.3z"/>
            </svg>
            <span className="btn-text">接口列表</span>
          </button>
          <button id="test-button">
            <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 512 512">
              <path fill="currentColor" d="M18.4 445c11.2 5.3 24.5 3.6 34.1-4.4L224 297.7V416c0 12.4 7.2 23.7 18.4 29s24.5 3.6 34.1-4.4L448 297.7V416c0 17.7 14.3 32 32 32s32-14.3 32-32V96c0-17.7-14.3-32-32-32s-32 14.3-32 32V214.3L276.5 71.4c-9.5-7.9-22.8-9.7-34.1-4.4S224 83.6 224 96V214.3L52.5 71.4c-9.5-7.9-22.8-9.7-34.1-4.4S0 83.6 0 96V416c0 12.4 7.2 23.7 18.4 29z"/>
            </svg>
            <span className="btn-text">随机测试</span>
          </button>
          <button id="docs-button">
            <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 448 512">
              <path fill="currentColor" d="M96 0C43 0 0 43 0 96V416c0 53 43 96 96 96H384h32c17.7 0 32-14.3 32-32s-14.3-32-32-32V384c17.7 0 32-14.3 32-32V32c0-17.7-14.3-32-32-32H384 96zm0 384H352v64H96c-17.7 0-32-14.3-32-32s14.3-32 32-32zm32-240c0-8.8 7.2-16 16-16H336c8.8 0 16 7.2 16 16s-7.2 16-16 16H144c-8.8 0-16-7.2-16-16zm16 48H336c8.8 0 16 7.2 16 16s-7.2 16-16 16H144c-8.8 0-16-7.2-16-16s7.2-16 16-16z"/>
            </svg>
            <span className="btn-text">接口文档</span>
          </button>
        </div>
      </main>
      {html`
        <script>
          document.getElementById("all-button").addEventListener("click", () => {
            window.location.href = "/all";
          });
          document.getElementById("docs-button").addEventListener("click", () => {
            window.open("https://apifox.com/apidoc/shared-af026de9-18d5-49ec-951d-1c48f21b7bb3");
          });
          document.getElementById("test-button").addEventListener("click", async () => {
            try {
              const response = await fetch('/all');
              if (!response.ok) {
                throw new Error('Network response was not ok');
              }
              const data = await response.json();
              const paths = data.routes
                .filter(route => route.path !== null)
                .map(route => route.path);
              if (paths.length > 0) {
                const randomPath = paths[Math.floor(Math.random() * paths.length)];
                window.location.href = randomPath;
              } else {
                console.error('No valid paths available');
              }
            } catch (error) {
              console.error('Failed to fetch paths:', error);
            }
          });
          // 跟随系统主题
          const darkModeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
          const toggleDarkMode = (darkModeMediaQuery) => {
            if (darkModeMediaQuery.matches) {
              document.documentElement.classList.add("dark");
            } else {
              document.documentElement.classList.remove("dark");
            }
          };
          darkModeMediaQuery.addEventListener("change", toggleDarkMode);
          toggleDarkMode(darkModeMediaQuery);

          const getApiVersion = async (url) => {
            try {
              const response = await fetch(url);
              if (!response.ok) {
                throw new Error('Network response was not ok');
              }
              const data = await response.json();
              return data
            } catch (error) {
              console.error('Failed to fetch API version:', error);
              return null;
            }
          }
          document.addEventListener('DOMContentLoaded', async () => {
            const version = "${config.VERSION}";
            const version_git = await getApiVersion('//raw.githubusercontent.com/kuole-o/api/refs/heads/main/package.json');
            const version_vercel = await getApiVersion('//raw.githubusercontent.com/kuole-o/api-vercel/refs/heads/main/package.json');
            // 模拟终端效果
            const terminalOutput = document.getElementById('terminal-output');
            const time = new Date();
            const times = time.toLocaleDateString() + " " + time.toTimeString();
            let terminalText, type, speed;
            let path = window.location.pathname;
            if (path === "/") {
              terminalText = \`Hello World!\\n服务已正常运行...\\nVersion: \${version}\\n\\n\${times}\\n\`;
              type = 1;
              speed = 30;
            } else {
              terminalText = \`出错了！\\n请检查您的调用路径与调用方法...\\nVersion: \${version}\\n\\n\${times}\\n\`;
              type = 2;
              speed = 20;
            }
            const printTerminalText = () => {
              let index = 0;
              const printChar = () => {
                if (index < terminalText.length) {
                  terminalOutput.textContent += terminalText[index];
                  index++;
                  setTimeout(printChar, speed);
                }
              };
              printChar();
            };
            printTerminalText();
            console.log('API 部署代码版本号:', version || '');
            console.log('API 远程仓库版本:', version_git.version);
          });
        </script>
      `}
    </Layout>
  );
};

export default Home;