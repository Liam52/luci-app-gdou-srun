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

		/* ---------------- 风险提示 ---------------- */
		title('风险提示');
		help('<div style="padding:10px 12px;border-radius:8px;background:rgba(198,40,40,.10);' +
			'border:1px solid rgba(198,40,40,.38);color:#b71c1c;font-size:12.5px;line-height:1.7">' +
			'<b>⚠ 以下为实验性功能，会改变网络结构。</b><br>' +
			'· 每条链路占一个<b>设备额度</b>，套餐设备数超限会把你正在用的设备顶下线；<br>' +
			'· 同一网口出现多个 MAC / IP，可能触发学校的<b>端口安全或共享检测</b>，最坏情况是网口被临时禁用；<br>' +
			'· 填写他人账号可能违反校规，并连累对方账号被处理；<br>' +
			'· 出错时可能导致<b>整机断网</b>，需要断电重启才能恢复。<br>' +
			'确认理解这些后果后再勾选下面的开关。</div>');

		help('本页配置只有在主页最下方勾选 <b>「启用高阶设置」</b> 后才生效——那是唯一的总开关。' +
			'未勾选时，下面的从账号与双链路全部不参与认证，主页面行为与普通单链路完全一致。<br>' +
			'（字段可见性由各从账号自己的「启用」开关控制，与总开关解耦。）');

		/* ---------------- 链路计划预览 ---------------- */
		title('链路计划');
		var planO = s.option(form.DummyValue, '_plan', null);
		planO.rawhtml = true;
		planO.default =
			'<div style="margin:2px 0 8px">' +
			'<div id="gdou-plan" style="padding:10px 12px;border-radius:8px;font-size:12.5px;' +
				'line-height:1.7;background:rgba(128,128,128,.08);' +
				'border:1px solid rgba(128,128,128,.22)">读取中…</div>' +
			'<div style="margin-top:6px"><button type="button" id="gdou-plan-refresh" ' +
				'class="btn cbi-button">重新计算</button></div>' +
			'<div style="opacity:.6;font-size:12px;margin-top:6px">' +
			'链路数 = 1（主链路） + 主账号双链路?1:0 + Σ 每个启用的从账号 × (1 + 该账号双链路?1:0)'+
				'<br><b style="color:#c62828">硬上限：含主链路最多 4 条</b>（3 个从账号各 1 条）。'+
				'超过 4 条容易被门户判定异常，超出部分不会建立。</div>' +
			'</div>';

		/* ---------------- 从账号配置（先填凭据，不决定是否启用）---------------- */
		title('从账号配置');
		var cfgHint = s.option(form.DummyValue, '_subcfghint', null);
		cfgHint.rawhtml = true;
		cfgHint.default =
			'<div style="font-size:12px;line-height:1.7;opacity:.75;margin:2px 0 10px">' +
			'这里只填「叫什么、密码多少、要不要双链路」，<b>填了不会立即生效</b>。' +
			'真正要不要用，由下面的「从账号启用」决定。</div>';

		for (var si = 1; si <= 3; si++) {
			o = s.option(form.Value, 'sub' + si + '_username', '从账号 ' + si + ' 学号',
				'该从账号的校园网学号。留空表示这个位置不用。');
			o.placeholder = '例如 20240002';
			o.rmempty = true;

			o = s.option(form.Value, 'sub' + si + '_password', '从账号 ' + si + ' 密码',
				'校园网密码，不是 WiFi 密码。');
			o.password = true;
			o.rmempty = true;

			o = s.option(form.Flag, 'sub' + si + '_dual', '从账号 ' + si + ' 也开双链路',
				'该账号会在两条链路上各登录一次，再多占 1 个设备额度。');
			o.default = '0';
			o.rmempty = false;
		}

		/* ---------------- 从账号启用（只负责开/关）---------------- */
		title('从账号启用');
		var enHint = s.option(form.DummyValue, '_subenhint', null);
		enHint.rawhtml = true;
		enHint.default =
			'<div style="font-size:12px;line-height:1.7;opacity:.75;margin:2px 0 10px">' +
			'只有这里打开的从账号才会真正建立链路并登录。<b>学号或密码为空时，' +
			'即使打开也不会建链</b>（守护进程会跳过并记录原因）。'+
				'总链路超过 4 条时，按 1→3 的顺序只建前几条。</div>';

		for (var sj = 1; sj <= 3; sj++) {
			o = s.option(form.Flag, 'sub' + sj + '_enabled', '启用从账号 ' + sj,
				'开启后按上面「从账号配置」里的凭据建立链路。');
			o.default = '0';
			o.rmempty = false;
		}

		/* ---------------- 手动操作 ---------------- */
		title('链路操作');
		var actO = s.option(form.DummyValue, '_dualacts', null);
		actO.rawhtml = true;
		actO.default =
			'<div style="margin:2px 0 8px">' +
			'<button type="button" class="btn cbi-button cbi-button-apply" ' +
				'data-gd2="up">建立全部链路</button> ' +
			'<button type="button" class="btn cbi-button" data-gd2="down">全部拆除</button> ' +
			'<button type="button" class="btn cbi-button" data-gd2="status">查看现状</button>' +
			'<pre id="gdou-dual-out" style="margin-top:8px;padding:8px 10px;border-radius:8px;' +
				'background:rgba(128,128,128,.08);font-size:11.5px;white-space:pre-wrap;' +
				'word-break:break-all;max-height:220px;overflow:auto"></pre>' +
			'</div>';

		return m.render().then(function (node) {
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
