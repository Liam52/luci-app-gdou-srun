'use strict';
'require view';
'require form';
'require fs';

/*
 * 首页：只看状态，不做配置。
 * 配置集中在「基础设置」和「高阶设置」两个标签页里。
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

function esc(s) {
	return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
		return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
	});
}

return view.extend({
	render: function () {
		var m = new form.Map('gdou-srun', '首页');

		var s = m.section(form.TypedSection, 'gdou_srun', '');
		s.anonymous = true;
		s.addremove = false;

		var dummySeq = 0;
		var o;

		function title(text) {
			dummySeq++;
			var t = s.option(form.DummyValue, '_head' + dummySeq, null);
			t.rawhtml = true;
			t.default = heading(text);
			return t;
		}

		/* ================= 顶部：状态 + 账号 + 操作 ================= */
		var heroO = s.option(form.DummyValue, '_hero', null);
		heroO.rawhtml = true;
		heroO.default =
			'<div class="gd-grid">' +
				'<div class="gd-card gd-hero">' +
					'<span id="gdou-dot" class="gd-dot"></span>' +
					'<div>' +
						'<div id="gdou-online" class="gd-big">读取中…</div>' +
						'<div class="gd-meta">广东海洋大学 · 深澜 srun' +
							'<span id="gdou-extra"></span></div>' +
					'</div>' +
					'<div class="gd-right">' +
						'<div id="gdou-ip" class="gd-mono">IP —</div>' +
						'<div id="gdou-mac" class="gd-mini">MAC —</div>' +
						'<button type="button" id="gdou-refresh" class="gd-btn gd-sm">刷新</button>' +
					'</div>' +
				'</div>' +
				'<div class="gd-card">' +
					'<h3 class="gd-h">账号</h3>' +
					'<dl class="gd-kv">' +
						'<dt>账号</dt><dd id="gdou-acc-user">—</dd>' +
						'<dt>服务器</dt><dd id="gdou-acc-server">—</dd>' +
						'<dt>双链路</dt><dd id="gdou-acc-dual">—</dd>' +
						'<dt>高阶设置</dt><dd id="gdou-acc-adv">—</dd>' +
						'<dt>定时重连</dt><dd id="gdou-acc-renew">—</dd>' +
						'<dt>上报标识</dt><dd id="gdou-acc-portal">—</dd>' +
					'</dl>' +
				'</div>' +
				'<div class="gd-card">' +
					'<h3 class="gd-h">操作</h3>' +
					'<div class="gd-row">' +
						'<button class="gd-btn gd-p" data-gd-qact="login">立即认证</button>' +
						'<button class="gd-btn" data-gd-qact="renew">立即重连</button>' +
						'<button class="gd-btn gd-d" data-gd-qact="logout">立即下线</button>' +
					'</div>' +
					'<div class="gd-row" style="margin-top:8px">' +
						'<button type="button" class="gd-btn" id="gdou-diag-btn">下载诊断包</button>' +
					'</div>' +
					'<div id="gdou-diag-msg" class="gd-mini" style="margin-top:4px"></div>' +
					'<pre id="gdou-q-result" class="gd-pre"></pre>' +
				'</div>' +
			'</div>';

		/* ================= 链路 ================= */
		var linkO = s.option(form.DummyValue, '_links', null);
		linkO.rawhtml = true;
		linkO.default =
			'<div class="gd-card" style="margin:2px 0 12px">' +
				'<h3 class="gd-h">链路</h3>' +
				'<div id="gdou-link-sum" class="gd-note" style="margin:0 0 8px">读取中…</div>' +
				'<div style="overflow-x:auto">' +
				'<table class="gd-tbl">' +
				'<thead><tr><th>链路</th><th>账号</th><th>IP</th><th>状态</th>' +
					'<th style="text-align:right">操作</th></tr></thead>' +
				'<tbody id="gdou-link-body"><tr><td colspan="5" class="gd-note">读取中…</td></tr></tbody>' +
				'</table>' +
				'</div>' +
				'<p class="gd-note">主链路 = 路由器本机 WAN；mcv0 / mcv1… 是按配置自动建立的虚拟链路（每条占一个设备额度）。' +
					'<br>每行「重连」只对这一条链路重新认证；「换 MAC/IP」会换掉它的 MAC 并重新 DHCP。含主链路最多 4 条。</p>' +
			'</div>';

		/* ================= 校园网在线设备 ================= */
		var portalO = s.option(form.DummyValue, '_portal', null);
		portalO.rawhtml = true;
		portalO.default =
			'<div class="gd-card" style="margin:2px 0 12px">' +
				'<h3 class="gd-h">校园网在线设备</h3>' +
				'<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:10px">' +
					'<span id="gdou-pcount" style="font-size:28px;font-weight:650;line-height:1">—</span>' +
					'<span class="gd-mini">台设备在线（学校侧统计）</span>' +
					'<span id="gdou-pnote" class="gd-mini"></span>' +
					'<button type="button" id="gdou-p-refresh" class="gd-btn gd-sm" ' +
						'style="margin-left:auto">刷新</button>' +
				'</div>' +
				'<div style="overflow-x:auto">' +
				'<table class="gd-tbl">' +
				'<thead><tr><th>IP</th><th>系统</th><th>设备类别</th><th>会话 ID</th></tr></thead>' +
				'<tbody id="gdou-p-body"><tr><td colspan="4" class="gd-note">读取中…</td></tr></tbody>' +
				'</table>' +
				'</div>' +
				'<p class="gd-note">套餐限同时在线设备数，超过会把旧会话顶下线。局域网里挂多少台设备都不影响这个数字。</p>' +
			'</div>';

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

			/* ---------- 连接状态 ---------- */
			var bar = {
				dot: node.querySelector('#gdou-dot'),
				online: node.querySelector('#gdou-online'),
				ip: node.querySelector('#gdou-ip'),
				mac: node.querySelector('#gdou-mac'),
				extra: node.querySelector('#gdou-extra'),
				btn: node.querySelector('#gdou-refresh')
			};

			function paint(info, state) {
				if (!bar.dot) return;
				var up = info && info.online === true;
				bar.dot.className = 'gd-dot' + (info ? (up ? ' on' : ' off') : '');
				bar.online.textContent = info ? (up ? '已联网' : '未联网') : '读取失败';
				bar.online.style.color = up ? '#2e7d32' : (info ? '#c62828' : '#999');
				bar.ip.textContent = 'IP ' + ((info && info.ip) || '—');
				bar.mac.textContent = 'MAC ' + ((info && info.mac) || '—');

				var bits = [];
				if (info && info.enabled === false) bits.push('自动认证已关闭');
				if (state && state.time) bits.push('上次 ' + state.time);
				if (state && state.msg) bits.push(String(state.msg).slice(0, 60));
				bar.extra.textContent = bits.join(' · ');
			}

			function refresh() {
				if (!bar.dot) return;
				fs.exec('/usr/libexec/gdou-srun-status', []).then(function (res) {
					var info = null;
					try { info = JSON.parse(((res && res.stdout) || '').trim()); } catch (e) { info = null; }
					fs.read('/tmp/gdou-srun.state').then(function (raw) {
						var state = null;
						try { state = JSON.parse((raw || '').trim()); } catch (e) { state = null; }
						paint(info, state);
						paintAccount(info);
					}).catch(function () { paint(info, null); paintAccount(info); });
				}).catch(function () { paint(null, null); });
			}

			function setText(id, html) {
				var el = node.querySelector('#' + id);
				if (el) el.innerHTML = html;
			}

			function paintAccount(info) {
				if (!info) return;
				setText('gdou-acc-user', info.user ? esc(info.user) : '未配置');
				setText('gdou-acc-server',
					esc(info.server || '—') + '　ac_id ' + esc(info.acid || '—'));
				setText('gdou-acc-renew', info.renew_enable === '1'
					? esc(info.renew_times || '—')
					: '<span style="opacity:.6">已关闭</span>');
				setText('gdou-acc-portal',
					esc((info.portal_name || '—') + ' / ' + (info.portal_os || '—')));
				setText('gdou-acc-macref', info.mac_refresh === '1'
					? '<b style="color:#e65100">已开启</b>'
					: '<span style="opacity:.6">已关闭</span>');
				setText('gdou-acc-dual', info.dual === '1'
					? '<b style="color:#2e7d32">已开启</b>（占 2 个设备额度）'
					: '<span style="opacity:.6">未开启</span>');
				setText('gdou-acc-adv', info.advanced === '1'
					? '<b>已启用</b>（从账号与多链路可用）'
					: '<span style="opacity:.6">未启用</span>');
			}

			refresh();
			if (bar.btn) {
				bar.btn.addEventListener('click', function (e) { e.preventDefault(); refresh(); });
			}
			var timer = setInterval(refresh, 5000);
			window.addEventListener('beforeunload', function () { clearInterval(timer); });

			/* ---------- 多链路 ---------- */
			var lb = node.querySelector('#gdou-link-body');
			var ls = node.querySelector('#gdou-link-sum');

			function badge(ok, textOn, textOff) {
				return ok
					? '<span class="gd-b gd-b-ok">' + textOn + '</span>'
					: '<span class="gd-b gd-b-bad">' + textOff + '</span>';
			}

			function paintLinks(info, dual) {
				if (!lb) return;
				var rows = [];

				function ops(iface, offline) {
					return '<td style="white-space:nowrap;text-align:right">' +
						'<button class="gd-btn gd-p gd-sm" ' +
							'data-gd-lop="reauth" data-gd-liface="' + esc(iface) + '">重连</button> ' +
						'<button class="gd-btn gd-sm" ' +
							'data-gd-lop="refresh" data-gd-liface="' + esc(iface) + '">换 MAC/IP</button> ' +
						(offline
							? '<span class="gd-b gd-b-off" style="margin-left:4px">已下线</span>'
							: '<button class="gd-btn gd-d gd-sm" ' +
								'data-gd-lop="offline" data-gd-liface="' + esc(iface) + '">下线</button>') +
						'</td>';
				}

				rows.push('<tr><td><b>主链路</b></td>' +
					'<td class="gd-num">' + esc((info && info.user) || '—') + '</td>' +
					'<td class="gd-num">' + esc((info && info.ip) || '—') + '</td>' +
					'<td>' + ((info && info.online) ? badge(true, '已认证', '') : badge(false, '', '未认证')) + '</td>' +
					ops('main', !!((dual && dual.main_offline))) + '</tr>');

				var existing = (dual && dual.existing) || [];
				existing.forEach(function (x) {
					var state = x.authed ? badge(true, '已认证', '')
						: (x.data_ok ? badge(false, '', '未认证') : badge(false, '', '数据不通'));
					rows.push('<tr><td><b>' + esc(x.iface.toUpperCase()) + '</b></td>' +
						'<td class="gd-num">' + esc(x.account || '—') + '</td>' +
						'<td class="gd-num">' + esc(x.ip || '—') + '</td>' +
						'<td>' + (x.offline ? '<span style="color:#c62828">● 已下线</span>' : state) + '</td>' +
						ops(x.iface, x.offline) + '</tr>');
				});

				var missing = (dual && dual.missing) || [];
				missing.forEach(function (x) {
					rows.push('<tr style="opacity:.6"><td><b>' + esc(x.iface.toUpperCase()) + '</b></td>' +
						'<td style="font-family:ui-monospace,monospace">' + esc(x.account || '—') + '</td>' +
						'<td>—</td><td><span style="opacity:.8">○ 未建立</span></td>' +
						'<td style="opacity:.6;font-size:11.5px">—</td></tr>');
				});

				lb.innerHTML = rows.join('');

				if (ls) {
					var planned = (dual && dual.planned) || 0;
					var ready = (dual && dual.ready) || 0;
					if (!dual || !dual.advanced) {
						ls.textContent = '只启用主链路（高阶设置未开启）';
					} else if (!planned) {
						ls.textContent = '只启用主链路（没有启用从账号或双链路）';
					} else {
						ls.textContent = '共 ' + (planned + 1) + ' 条链路，虚拟链路就绪 ' + ready + ' / ' + planned;
					}
				}
			}

			function refreshLinks() {
				if (!lb) return;
				fs.exec('/usr/libexec/gdou-srun-status', []).then(function (res) {
					var info = null;
					try { info = JSON.parse(((res && res.stdout) || '').trim()); } catch (e) { info = null; }
					fs.exec('/usr/libexec/gdou-srun-dual', ['status']).then(function (r2) {
						var dual = null;
						try { dual = JSON.parse(((r2 && r2.stdout) || '').trim()); } catch (e) { dual = null; }
						paintLinks(info, dual);
					}).catch(function () { paintLinks(info, null); });
				}).catch(function () { paintLinks(null, null); });
			}

			/* 行内「重连 / 换 MAC-IP」按钮（事件委托，行重绘后依然有效） */
			if (lb && !lb._gdBound) {
				lb._gdBound = true;
				lb.addEventListener('click', function (ev) {
					var el = ev.target;
					var btn = null;
					while (el && el !== lb) {
						if (el.tagName === 'BUTTON' && el.getAttribute('data-gd-lop')) { btn = el; break; }
						el = el.parentNode;
					}
					if (!btn || btn.disabled) return;
					ev.preventDefault();

					var op = btn.getAttribute('data-gd-lop');
					var iface = btn.getAttribute('data-gd-liface');
					var label = (iface === 'main' ? '主链路' : iface.toUpperCase());
					var what = (op === 'refresh' ? '换 MAC/IP' : (op === 'offline' ? '下线' : '重新认证'));
					var out = node.querySelector('#gdou-q-result');

					var all = lb.querySelectorAll('button[data-gd-lop]');
					Array.prototype.forEach.call(all, function (x) { x.disabled = true; });
					var old = btn.textContent;
					btn.textContent = '执行中…';
					if (out) {
						out.style.color = '';
						out.textContent = label + ' ' + what + ' 中…（约 10~30 秒）';
					}

					fs.exec('/usr/libexec/gdou-srun-dual', [op, iface]).then(function (res) {
						var text = ((res && res.stdout) || '').trim() ||
							((res && res.stderr) || '').trim() || '（无输出）';
						if (out) {
							out.textContent = label + ' ' + what + ' 完成：' + text;
							out.style.color = text.indexOf('"ok": true') >= 0 ? '#2e7d32' : '#c62828';
						}
						refreshLinks();
						refresh();
					}).catch(function (err) {
						if (out) {
							out.textContent = label + ' ' + what + ' 失败：' + err;
							out.style.color = '#c62828';
						}
					}).finally(function () {
						btn.textContent = old;
						Array.prototype.forEach.call(all, function (x) { x.disabled = false; });
					});
				});
			}

			refreshLinks();
			var lTimer = setInterval(refreshLinks, 15000);
			window.addEventListener('beforeunload', function () { clearInterval(lTimer); });

			/* ---------- 门户在线设备 ---------- */
			var pBody = node.querySelector('#gdou-p-body');
			var pCount = node.querySelector('#gdou-pcount');
			var pNote = node.querySelector('#gdou-pnote');
			var pBtn = node.querySelector('#gdou-p-refresh');

			function paintPortal(p) {
				if (!pBody) return;
				if (!p || !p.ok) {
					var err = (p && p.error) || '';
					var msg;
					if (err.indexOf('speed_limit') >= 0) {
						msg = '门户正在限流（speed_limit_error）——通常是短时间内认证/查询太频繁，' +
							'过几分钟会自动恢复，期间不影响上网。';
					} else if (err.indexOf('not_online') >= 0) {
						msg = '当前未认证，所以读不到账号下的设备列表。';
					} else {
						msg = '读不到门户数据（门户不可达或响应异常）';
					}
					pBody.innerHTML = '<tr><td colspan="4" style="opacity:.7">' + esc(msg) + '</td></tr>';
					if (pCount) pCount.textContent = '—';
					if (pNote) pNote.textContent = err ? '（' + err + '）' : '';
					return;
				}
				if (pCount) pCount.textContent = String(p.count || 0);
				if (pNote) {
					pNote.textContent = (p.product ? p.product + ' · ' : '') +
						'本机 ' + (p.self || '未知');
				}
				var rows = (p.items || []).map(function (x) {
					var tag = x['self']
						? '<span style="margin-left:6px;padding:1px 5px;border-radius:4px;' +
							'background:rgba(46,125,50,.15);color:#2e7d32;font-size:11px">本机</span>'
						: '';
					return '<tr>' +
						'<td style="font-family:ui-monospace,monospace;white-space:nowrap">' +
							esc(x.ip) + tag + '</td>' +
						'<td>' + esc(x.os || '—') + '</td>' +
						'<td>' + esc(x['class'] || '—') + '</td>' +
						'<td style="font-family:ui-monospace,monospace;opacity:.7">' + esc(x.id) + '</td>' +
						'</tr>';
				});
				pBody.innerHTML = rows.join('') ||
					'<tr><td colspan="4" style="opacity:.6">没有在线会话</td></tr>';
			}

			function refreshPortal() {
				fs.exec('/usr/libexec/gdou-srun-devices', []).then(function (res) {
					var data = null;
					try { data = JSON.parse(((res && res.stdout) || '').trim()); } catch (e) { data = null; }
					paintPortal(data && data.portal);
				}).catch(function () { paintPortal(null); });
			}

			refreshPortal();
			if (pBtn) {
				pBtn.addEventListener('click', function (e) { e.preventDefault(); refreshPortal(); });
			}
			var pTimer = setInterval(refreshPortal, 10000);
			window.addEventListener('beforeunload', function () { clearInterval(pTimer); });

			/* ---------- 诊断包下载 ---------- */
			var diagBtn = node.querySelector('#gdou-diag-btn');
			var diagMsg = node.querySelector('#gdou-diag-msg');

			function stamp() {
				var d = new Date();
				function p2(n) { return (n < 10 ? '0' : '') + n; }
				return d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate()) + '-' +
					p2(d.getHours()) + p2(d.getMinutes()) + p2(d.getSeconds());
			}

			if (diagBtn) {
				diagBtn.addEventListener('click', function (ev) {
					ev.preventDefault();
					var old = diagBtn.textContent;
					diagBtn.disabled = true;
					diagBtn.textContent = '正在收集…';
					if (diagMsg) {
						diagMsg.style.color = '';
						diagMsg.textContent = '正在收集配置、接口、路由和日志（约 10 秒）…';
					}

					fs.exec('/usr/libexec/gdou-srun-diag', []).then(function (res) {
						var text = (res && res.stdout) || '';
						if (!text) {
							throw new Error('诊断脚本没有输出');
						}
						var name = 'gdou-diag-' + stamp() + '.txt';
						var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
						var url = URL.createObjectURL(blob);
						var a = document.createElement('a');
						a.href = url;
						a.download = name;
						document.body.appendChild(a);
						a.click();
						setTimeout(function () {
							URL.revokeObjectURL(url);
							if (a.parentNode) a.parentNode.removeChild(a);
						}, 1500);
						if (diagMsg) {
							diagMsg.style.color = '#2e7d32';
							diagMsg.textContent = '已生成 ' + name +
								'（' + Math.round(text.length / 1024) + ' KB）';
						}
					}).catch(function (err) {
						if (diagMsg) {
							diagMsg.style.color = '#c62828';
							diagMsg.textContent = '下载失败：' + err;
						}
					}).finally(function () {
						diagBtn.disabled = false;
						diagBtn.textContent = old;
					});
				});
			}

			/* ---------- 快捷操作 ---------- */
			var out = node.querySelector('#gdou-q-result');
			var buttons = node.querySelectorAll('[data-gd-qact]');

			Array.prototype.forEach.call(buttons, function (btn) {
				btn.addEventListener('click', function () {
					var act = btn.getAttribute('data-gd-qact');
					var script = '/usr/libexec/gdou-srun';
					var args = [act];
					var label = act;
					var i = act.indexOf(':');
					if (i > 0) {
						var kind = act.substring(0, i);
						var sub = act.substring(i + 1);
						label = kind + ' ' + sub;
						if (kind === 'dual') {
							script = '/usr/libexec/gdou-srun-dual';
							args = [sub];
						} else if (kind === 'mac') {
							script = '/usr/libexec/gdou-srun-mac';
							args = [sub];
						}
					}
					if (out) {
						out.style.color = '';
						out.textContent = '正在执行 ' + label + ' ...';
					}
					Array.prototype.forEach.call(buttons, function (b) { b.disabled = true; });
					fs.exec(script, args).then(function (res) {
						var text = ((res && res.stdout) || '').trim() ||
							((res && res.stderr) || '').trim() || '（无输出）';
						if (out) {
							out.textContent = text;
							out.style.color = text.indexOf('"ok": true') >= 0 ? '#2e7d32' : '#c62828';
						}
						refresh();
						refreshPortal();
					}).catch(function (err) {
						if (out) {
							out.textContent = '执行失败：' + err;
							out.style.color = '#c62828';
						}
					}).finally(function () {
						Array.prototype.forEach.call(buttons, function (b) { b.disabled = false; });
					});
				});
			});

			return node;
		});
	}
});
