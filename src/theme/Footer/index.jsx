/**
 * @fileoverview 站点页尾组件。
 * 覆盖 Docusaurus 默认 Footer，在每页底部展示：
 * - 「关于我」：站主是基督徒，本网站记录教会讲道笔记，愿借此分享信仰。
 * - 「联系我们」：通过 form.taxi 表单发送留言（收件邮箱见 form action）。
 */

import React from 'react';

/** form.taxi 表单提交地址（留言会发送到站主邮箱） */
const CONTACT_FORM_ACTION = 'https://form.taxi/s/nazc3qhm';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <section className="footer__about">
          <h2>关于我</h2>
          <p>
            我是一名基督徒。这个网站记录我在教会听讲道的笔记，
            愿借这些内容与大家分享神的话语、彼此造就。若有感动，也欢迎一起交流信仰。
          </p>
        </section>

        <section className="footer__contact">
          <h2>联系我们</h2>
          <p>如有问题、建议，或想分享你的信仰见证，欢迎通过下面的表单联系我。</p>
          <form
            className="footer__form"
            action={CONTACT_FORM_ACTION}
            method="POST"
            encType="multipart/form-data"
          >
            <input type="text" name="name" placeholder="您的姓名" required />
            <input type="email" name="email" placeholder="您的邮箱" required />
            <textarea name="message" placeholder="您的留言" rows={4} required />
            <input type="hidden" name="_subject" value="来自 Bible Sermons 的留言" />
            {/* form.taxi 蜜罐字段：用于拦截机器人，人类用户无需填写 */}
            <input
              type="text"
              name="_gotcha"
              style={{display: 'none'}}
              tabIndex={-1}
              autoComplete="off"
            />
            <button type="submit">发送留言</button>
          </form>
        </section>

        <div className="footer__divider" />
        <div className="footer__copyright">
          © Bible Sermons · 以圣经为中心分享神的话语
        </div>
      </div>
    </footer>
  );
}
