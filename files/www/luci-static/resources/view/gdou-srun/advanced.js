'use strict';
'require view';
'require form';
'require fs';

/*
 * 高阶设置（独立二级页）：多账号 + 多链路聚合。
 * 从主设置页拆出来的原因：这里的每一项都会改变网络结构，
 * 和日常「填学号密码」放一起容易被误触。
 */

function heading(text) {
	return '<div style="font-weight:600;margin:14px 0 4px;padding-bottom:4px;' +
		'border-bottom:1px solid rgba(128,128,128,.25)">' + text + '</div>';
}

/* 注入公共样式（只注入一次） */
function ensureUiCss() {
	var id = 'gdou-ui-css';
	if (document.getElementById(id)) return;
	var l = document.createElement('link');
	l.id = id;
	l.rel = 'stylesheet';
	l.href = '/luci-static/resources/gdou-srun/ui.css';
	document.head.appendChild(l);
}

return view.extend({
	render: function () {
		var m = new form.Map('gdou-srun', '高阶设置',
			'多账号与多链路聚合。实验性功能，改动前请先读完下面的警告。');

		var s = m.section(form.TypedSection, 'gdou_srun', '高阶设置');
		s.anonymous = true;
		s.addremove = false;

		var dummySeq = 0;
		var o;

		function help(text) {
			dummySeq++;
			var h = s.option(form.DummyValue, '_help' + dummySeq, null);
			h.rawhtml = true;
			h.default = '<div style="opacity:.75;font-size:92%;margin:2px 0 8px">' + text + '</div>';
			return h;
		}

		function title(text) {
			dummySeq++;
			var t = s.option(form.DummyValue, '_head' + dummySeq, null);
			t.rawhtml = true;
			t.default = heading(text);
			return t;
		}

		/* ================= 风险提示（默认折叠）================= */
		var riskO = s.option(form.DummyValue, '_risk', null);
		riskO.rawhtml = true;
		riskO.default =
			'<details class="gd-fold"><summary>⚠ 风险提示（点开阅读）</summary>' +
			'<div class="gd-foldbody">' +
			'· 每条链路占一个<b>设备额度</b>，套餐设备数超限会把你正在用的设备顶下线；<br>' +
			'· 同一网口出现多个 MAC / IP，可能触发学校的<b>端口安全或共享检测</b>，最坏情况是网口被临时禁用；<br>' +
			'· 填写他人账号可能违反校规，并连累对方账号被处理；<br>' +
			'· 出错时可能导致<b>整机断网</b>，需要断电重启才能恢复。' +
			'</div></details>';

		var gateO = s.option(form.DummyValue, '_gate', null);
		gateO.rawhtml = true;
		gateO.default =
			'<div class="gd-note" style="margin:0 0 12px">' +
			'本页配置需要先在「设置」页勾选 <b>开启进阶选项</b> 才生效。' +
			'未开启时下面的从账号与双链路都不会参与认证。</div>';

		/* ================= 链路计划 ================= */
		var planCard = s.option(form.DummyValue, '_plancard', null);
		planCard.rawhtml = true;
		planCard.default =
			'<div class="gd-sect"><div class="gd-h">链路计划</div>' +
			'<div id="gdou-plan" style="padding:10px 12px;border-radius:8px;font-size:12.5px;' +
				'line-height:1.75;background:rgba(128,128,128,.08);' +
				'border:1px solid rgba(128,128,128,.22)">读取中…</div>' +
			'<div style="margin-top:10px"><button type="button" id="gdou-plan-refresh" ' +
				'class="gd-btn">重新计算</button></div>' +
			'<p class="gd-note">链路数 = 1（主链路）+ 主账号双链路?1:0 + Σ 每个启用的从账号 × (1 + 该账号双链路?1:0)<br>' +
			'<b style="color:#c62828">硬上限：含主链路最多 4 条</b>，超出部分不会建立。</p></div>';

		/* ================= 从账号配置 ================= */
		var cfgCardHead = s.option(form.DummyValue, '_cfghead', null);
		cfgCardHead.rawhtml = true;
		cfgCardHead.default =
			'<div class="gd-sect"><div class="gd-h">从账号配置</div>' +
			'<p class="gd-note" style="margin:0">只填「叫什么、密码多少、要不要双链路」，' +
			'<b>填了不会立即生效</b>。是否真正使用由下面的「从账号启用」决定。</p></div>';

		for (var si = 1; si <= 3; si++) {
			dummySeq++;
			var sub = s.option(form.DummyValue, '_subh' + dummySeq, null);
			sub.rawhtml = true;
			sub.default = '<div class="gd-sub">从账号 ' + si + '</div>';

			o = s.option(form.Value, 'sub' + si + '_username', '学号',
				'该从账号的校园网学号。留空表示这个位置不用。');
			o.placeholder = '例如 20240002';
			o.rmempty = true;

			o = s.option(form.Value, 'sub' + si + '_password', '密码',
				'校园网密码，不是 WiFi 密码。');
			o.password = true;
			o.rmempty = true;

			o = s.option(form.Flag, 'sub' + si + '_dual', '也开双链路',
				'该账号在两条链路上各登录一次，再多占 1 个设备额度。');
			o.default = '0';
			o.rmempty = false;
		}


		/* ================= 从账号启用 ================= */
		var enCardHead = s.option(form.DummyValue, '_enhead', null);
		enCardHead.rawhtml = true;
		enCardHead.default =
			'<div class="gd-sect"><div class="gd-h">从账号启用</div>' +
			'<p class="gd-note" style="margin:0">只有这里打开的从账号才会真正建立链路并登录。' +
			'<b>学号或密码为空时即使打开也不会建链</b>。总链路超过 4 条时按 1→3 顺序只建前几条。</p></div>';

		for (var sj = 1; sj <= 3; sj++) {
			o = s.option(form.Flag, 'sub' + sj + '_enabled', '启用从账号 ' + sj,
				'开启后按上面「从账号配置」里的凭据建立链路。');
			o.default = '0';
			o.rmempty = false;
		}


		/* ================= 分流模式 ================= */
		var splitCard = s.option(form.DummyValue, '_splitcard', null);
		splitCard.rawhtml = true;
		splitCard.default = '<div class="gd-sect"><div class="gd-h">分流</div>' +
			'<p class="gd-note" style="margin:0">决定多条链路怎么分担流量，只有存在第二条链路时生效。</p></div>';

		o = s.option(form.ListValue, 'split_mode', '模式',
			'决定多条链路怎么分担流量，只有存在第二条链路时生效。');
		o.value('backup', '网络备份（主链路掉线时整段切换）');
		o.value('conn', '按连接分流（叠加总吞吐）');
		o.value('dev', '按设备分流（两拨设备互不抢）');
		o.default = 'backup';
		o.rmempty = false;

		var splitFoot = s.option(form.DummyValue, '_splitfoot', null);
		splitFoot.rawhtml = true;
		splitFoot.default =
			'<p class="gd-note" style="margin:0 0 12px">' +
			'想叠加带宽选「按连接分流」；只想保底选「网络备份」。' +
			'单个连接始终只走一条链路，所以单文件下载不会变快。</p>';

		/* ================= 链路操作 ================= */
		var actO = s.option(form.DummyValue, '_dualacts', null);
		actO.rawhtml = true;
		actO.default =
			'<div class="gd-sect"><div class="gd-h">链路操作</div>' +
			'<div style="display:flex;gap:8px;flex-wrap:wrap">' +
			'<button type="button" class="gd-btn gd-p" data-gd2="up">建立全部链路</button>' +
			'<button type="button" class="gd-btn" data-gd2="status">查看现状</button>' +
			'<button type="button" class="gd-btn gd-d" data-gd2="down">全部拆除</button>' +
			'</div>' +
			'<pre id="gdou-dual-out" style="margin-top:10px;padding:9px 11px;border-radius:8px;' +
				'background:rgba(128,128,128,.08);font-size:11.5px;white-space:pre-wrap;' +
				'word-break:break-all;max-height:220px;overflow:auto"></pre></div>';

		return m.render().then(function (node) {
			ensureUiCss();
			/* 页面级作用域：让原生表单控件也套用统一风格 */
			var gdRoot = (node.matches && node.matches('.cbi-map')) ? node :
				(node.querySelector('.cbi-map') || node.querySelector('.cbi-section') || node);
			if (gdRoot && gdRoot.classList) gdRoot.classList.add('gd-page');

			/* Argon 给 .cbi-value-title 固定了 23rem 宽，标签为空的区块会被挤窄。
			   这里把「内容是我们自定义区块」的行标成 gd-full，由 CSS 压掉标签列。 */
			var gdRows = node.querySelectorAll('.cbi-value');
			Array.prototype.forEach.call(gdRows, function (row) {
				if (row.querySelector('.gd-grid, .gd-card, .gd-tbl, .gd-sect, .gd-alert, details.gd-fold'))
					row.classList.add('gd-full');
			});

			/* ---- 链路计划 ---- */
			var planBox = node.querySelector('#gdou-plan');
			var planBtn = node.querySelector('#gdou-plan-refresh');

			function refreshPlan() {
				if (!planBox) return;
				planBox.textContent = '读取中…';
				fs.exec('/usr/libexec/gdou-srun-dual', ['plan']).then(function (res) {
					var d = null;
					try {
						d = JSON.parse(((res && res.stdout) || '').trim());
					} catch (e) { d = null; }
					if (!d) { planBox.textContent = '读取失败'; return; }
					if (!d.advanced) {
						planBox.innerHTML = '<b>高阶设置未启用</b> —— 当前只有主链路 1 条，' +
							'勾选上面的开关并保存后这里会显示计划。';
						return;
					}
					if (!d.count) {
						planBox.innerHTML = '<b>计划 1 条链路</b> —— 只有主链路（没有启用任何从账号或双链路）。';
						return;
					}
					var rows = d.links.map(function (l) {
						return '· ' + l.iface.toUpperCase() + '  账号 ' + l.account +
							'　' + l.note + '　路由表 ' + l.table;
					});
					planBox.innerHTML = '<b>计划共 ' + (d.count + 1) + ' 条链路</b>' +
						'（1 条主链路 + ' + d.count + ' 条虚拟链路）<br>' + rows.join('<br>');
				}).catch(function () { planBox.textContent = '读取失败'; });
			}

			refreshPlan();
			if (planBtn) {
				planBtn.addEventListener('click', function (e) {
					e.preventDefault();
					refreshPlan();
				});
			}

			/* ---- 手动操作 ---- */
			var out = node.querySelector('#gdou-dual-out');
			var btns = node.querySelectorAll('[data-gd2]');

			Array.prototype.forEach.call(btns, function (btn) {
				btn.addEventListener('click', function () {
					var act = btn.getAttribute('data-gd2');
					if (out) {
						out.style.color = '';
						out.textContent = '正在执行 ' + act + ' ...';
					}
					Array.prototype.forEach.call(btns, function (b) { b.disabled = true; });
					fs.exec('/usr/libexec/gdou-srun-dual', [act]).then(function (res) {
						var text = ((res && res.stdout) || '').trim() ||
							((res && res.stderr) || '').trim() || '（无输出）';
						if (out) {
							out.textContent = text;
							out.style.color = text.indexOf('"ok": true') >= 0 ? '#2e7d32' : '#c62828';
						}
						refreshPlan();
					}).catch(function (err) {
						if (out) {
							out.textContent = '执行失败：' + err;
							out.style.color = '#c62828';
						}
					}).finally(function () {
						Array.prototype.forEach.call(btns, function (b) { b.disabled = false; });
					});
				});
			});

			return node;
		});
	}
});
