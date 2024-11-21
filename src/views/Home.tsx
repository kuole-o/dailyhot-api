import type { FC } from "hono/jsx";
import { html } from "hono/html";
import Layout from "./Layout.js";

const Home: FC = () => {
  return (
    <Layout title="API Collection">
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

          // 模拟终端效果
          const terminalOutput = document.getElementById('terminal-output');
          const time = new Date();
          const times = time.toLocaleDateString() + " " + time.toTimeString();
          let terminalText, type, speed;
          let path = window.location.pathname;
          if (path === "/") {
            terminalText = \`Hello World!\\n服务已正常运行...\\n\\n\${times}\\n\`;
            type = 1;
            speed = 30;
          } else {
            terminalText = \`出错了！\\n请检查您的调用路径与调用方法...\\n\\n\${times}\\n\`;
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
          document.addEventListener('DOMContentLoaded', function () {
            printTerminalText();
            fetch('https://raw.githubusercontent.com/kuole-o/api/main/package.json')
              .then(response => response.json())
              .then(data => {
                console.log('当前 API 远程仓库版本号:', data.version);
              })
              .catch(error => {
                console.error('获取版本号失败:', error);
              });
          });
        </script>
      `}
    </Layout>
  );
};

export default Home;