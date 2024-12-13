import type { FC } from "hono/jsx";
import { css, Style } from "hono/css";

const Layout: FC = (props) => {
  const globalClass = css`
    :-hono-global {
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        -webkit-user-drag: none;
      }
      :root {
        --text-color: #333;
        --text-color-gray: #707070;
        --text-color-hover: #fff;
        --icon-color: #444;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --text-color: #fff;
          --text-color-gray: #707070;
          --text-color-hover: #3c3c3c;
          --icon-color: #707070;
        }
      }
      a {
        text-decoration: none;
        color: var(--text-color);
      }
      body {
        width: 100vw;
        height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        font-size: 16px;
        color: var(--text-color);
        background-color: var(--text-color-hover);
        font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei";
        transition: color 0.3s, background-color 0.3s;
        overflow: hidden; /* 防止滚动条出现 */
        -webkit-user-select: text; /* Safari */
        -moz-user-select: text; /* Firefox */
        -ms-user-select: text; /* IE10+ */
        user-select: text; /* 标准语法 */
      }
      main {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 20px;
        margin: 20px 20px 80px 20px;
        position: absolute;
      }
      @media screen and (max-width: 768px) {
        main {
          margin: 0px 0px 80px 0px;
          padding: 0px;
        }
        .terminal {
          margin-top: 0rem;
        }
      }
      .img {
        width: 120px;
        height: 120px;
        margin-bottom: 20px;
      }
      .img img,
      .img svg {
        width: 100%;
        height: 100%;
      }
      .title {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-bottom: 40px;
      }
      .title .title-text {
        font-size: 28px;
        font-weight: bold;
        margin-bottom: 12px;
        text-align: center;
      }
      .title .title-tip {
        font-size: 20px;
        opacity: 0.8;
      }
      .content  {
        flex: 1;
      }
      .title .content {
        margin: 20px 0px 0px 0px;
        display: flex;
        padding: 20px;
        border-radius: 12px;
        border: 1px dashed var(--text-color);
        user-select: text;
      }
      .control {
        display: flex;
        flex-direction: row;
        align-items: center;
      }
      .control button {
        display: flex;
        flex-direction: row;
        align-items: center;
        color: var(--text-color);
        border: var(--text-color) solid;
        background-color: var(--text-color-hover);
        border-radius: 8px;
        padding: 8px 12px;
        margin: 0 8px;
        transition: color 0.3s, background-color 0.3s;
        cursor: pointer;
      }
      .control button .btn-icon {
        width: 22px;
        height: 22px;
        margin-right: 8px;
      }
      .control button .btn-text {
        font-size: 14px;
      }
      .control button:hover {
        border: var(--text-color) solid;
        background: var(--text-color);
        color: var(--text-color-hover);
      }
      .control button i {
        margin-right: 6px;
      }
      footer {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        position: relative;
        margin-top: auto;
      }
      .social {
        display: flex;
        flex-direction: row;
        align-items: center;
        margin-bottom: 8px;
      }
      .social .link {
        display: flex;
        flex-direction: row;
        align-items: center;
        margin: 0 4px;
      }
      .social .link::after {
        content: "";
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background-color: var(--text-color);
        opacity: 0.4;
        margin-left: 8px;
      }
      .social .link:last-child::after {
        display: none;
      }
      .social .link svg {
        width: 22px;
        height: 22px;
      }
      footer .power,
      footer .icp {
        font-size: 14px;
      }
      footer a {
        color: var(--text-color-gray);
        transition: color 0.3s;
      }
      footer a:hover {
        color: var(--text-color);
      }

      html {
        height: 100%;
      }
      /* 终端样式 */
      .terminal {
        position: relative;
        margin-top: 10px;
        display: flex; /* 添加flex属性 */
        flex-direction: column; /* 添加flex属性 */
        align-items: center; /* 添加flex属性 */
        justify-content: space-between; /* 添加flex属性 */
      }
      .typewriterContent {
        background-color: #282828;
        border-radius: 10px;
        padding: 10px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
        overflow: auto;
        font-family: monospace;
        font-size: 1rem;
        color: #00ff00;
        white-space: pre;
        width: 48rem;
        position: relative;
        transition: all 0.3s ease 0s;
        overflow-x: auto;
      }
      .typewriterContent.fail {
        color: #ffb62c;
      }
      #terminal-output {
        line-height: 1.5rem;
        margin: 30px 6px;
        height: 6rem;
      }
      .control {
        margin-top: 2rem;
        position: relative;
      }
      .control button {
        background-color: var(--text-color-hover);
        border: var(--text-color) solid;
        border-radius: 4px;
        padding: 0.5rem 1.2rem;
        transition: all 0.5s ease;
        margin: 1rem 0.4rem;
        color: var(--text-color);
        cursor: pointer;
        transition: all 0.3s ease 0s;
      }
      .control button:hover {
        border: var(--text-color) solid;
        background: var(--text-color);
        color: var(--text-color-hover);
      }
      .control button i {
        margin-right: 6px;
      }
      /* 工具栏样式 */
      .toolbar {
        display: inline-flex;
        justify-content: left;
        position: absolute;
        width: 100%;
        top: 0;
        left: 0;
        padding: 10px;
        background-color: #3d3d3d;
        border-top-left-radius: 10px;
        border-top-right-radius: 10px;
        z-index: 1;
      }
      /* 小圆点样式 */
      .dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        margin-left: 10px;
      }
      .red {
        background-color: #ff5f56;
      }
      .yellow {
        background-color: #ffbd2e;
      }
      .green {
        background-color: #27c93f;
      }
      @media screen and (max-width: 1024px) {
        body {
          font-size: 24px;
        }
        main.home .img {
          width: 100px;
          height: 100px;
        }
        .ico {
          font-size: 5rem;
          margin: 5rem 2rem 2rem 2rem;
        }
        .title {
          font-size: 14px;
          margin-bottom: 20px;
        }
        .terminal {
          margin-top: 2rem;
        }
        .typewriterContent {
          width: calc(100vw - 22px); /* 计算宽度 */
          overflow-x: auto; /* 横向滚动条 */
          padding: 50px 10px;
        }
        #terminal-output {
          line-height: 1.58rem;
          margin: unset;
        }
        .control button {
          font-size: 1rem;
          margin: 0 6px;
        }
        .control button i {
          margin: unset;
        }
        .control span.btn-text {
          display: none;
        }
        .control button .btn-icon {
          margin-right: unset;
          width: 18px;
          height: 18px;
        }
        footer .power,
        footer .icp {
          font-size: 13px;
        }
        footer .power {
          display: none;
        }   
      }
    }
  `;

  return (
    <html lang="zh-CN">
      <head>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta charSet="utf-8" />
        <title>{props.title}</title>
        <link rel="icon" href="data:image/png;base64,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" />
        <meta name="description" content="自用 API 接口集合" />
        <Style>{globalClass}</Style>
      </head>
      <body>
        {props.children}
        <footer>
          <div className="social">
            <a
              href="https://github.com/kuole-o/api"
              className="link"
              target="_blank"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
              >
                <path
                  fill="currentColor"
                  d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33c.85 0 1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2"
                />
              </svg>
            </a>
            <a href="https://guole.fun/" className="link" target="_blank">
              <svg
                className="btn-icon"
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
              >
                <path
                  fill="currentColor"
                  d="M10 19v-5h4v5c0 .55.45 1 1 1h3c.55 0 1-.45 1-1v-7h1.7c.46 0 .68-.57.33-.87L12.67 3.6c-.38-.34-.96-.34-1.34 0l-8.36 7.53c-.34.3-.13.87.33.87H5v7c0 .55.45 1 1 1h3c.55 0 1-.45 1-1"
                />
              </svg>
            </a>
            <a href="mailto:guole.fun@qq.com" className="link">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
              >
                <path
                  fill="currentColor"
                  d="m20 8l-8 5l-8-5V6l8 5l8-5m0-2H4c-1.11 0-2 .89-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2"
                />
              </svg>
            </a>
          </div>
          <div className="power">
            Copyright&nbsp;©&nbsp;
            <a href="https://www.imsyy.top/" target="_blank">
              無名
            </a>
            &nbsp;|&nbsp;Power by&nbsp;
            <a href="https://github.com/honojs/hono/" target="_blank">
              Hono
            </a>
          </div>
          <div className="icp">
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
            >
              粤 ICP 备 2021063163 号
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
};

export default Layout;
