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

		/* ---------------- 连接状态 ---------------- */
		title('连接状态');
		var statusO = s.option(form.DummyValue, '_statusbar', null);
		statusO.rawhtml = true;
		statusO.default =
			'<div id="gdou-statusbar" style="display:flex;flex-wrap:wrap;align-items:center;gap:14px;' +
			'padding:14px 16px;margin:0 0 6px;border-radius:10px;' +
			'background:rgba(128,128,128,.10);border:1px solid rgba(128,128,128,.22);font-size:13px">' +
			'<span id="gdou-dot" style="width:10px;height:10px;border-radius:50%;background:#999;flex:none"></span>' +
			'<b id="gdou-online" style="min-width:56px;font-size:15px">读取中…</b>' +
			'<span id="gdou-ip" style="opacity:.8">IP —</span>' +
			'<span id="gdou-mac" style="opacity:.8;font-family:ui-monospace,monospace">MAC —</span>' +
			'<span id="gdou-extra" style="opacity:.6;flex-basis:100%"></span>' +
			'<button type="button" id="gdou-refresh" class="btn cbi-button" style="margin-left:auto">刷新</button>' +
			'</div>';

		/* ---------------- 主账号摘要 ---------------- */
		title('主账号');
		var sumO = s.option(form.DummyValue, '_summary', null);
		sumO.rawhtml = true;
		sumO.default =
			'<table class="table" style="width:100%;font-size:13px;margin:0 0 6px">' +
			'<tr><td style="width:38%;opacity:.7">学号</td>' +
				'<td id="gdou-acc-user" style="font-family:ui-monospace,monospace">—</td></tr>' +
			'<tr><td style="opacity:.7">认证服务器</td>' +
				'<td id="gdou-acc-server" style="font-family:ui-monospace,monospace">—</td></tr>' +
			'<tr><td style="opacity:.7">定时重连</td><td id="gdou-acc-renew">—</td></tr>' +
			'<tr><td style="opacity:.7">上报标识</td><td id="gdou-acc-portal">—</td></tr>' +
			'<tr><td style="opacity:.7">MAC 轮换</td><td id="gdou-acc-macref">—</td></tr>' +
			'<tr><td style="opacity:.7">双链路</td><td id="gdou-acc-dual">—</td></tr>' +
			'<tr><td style="opacity:.7">高阶设置</td><td id="gdou-acc-adv">—</td></tr>' +
			'</table>';

		/* ---------------- 多链路 ---------------- */
		title('多链路');
		var linkO = s.option(form.DummyValue, '_links', null);
		linkO.rawhtml = true;
		linkO.default =
			'<div style="margin:2px 0 10px">' +
			'<div id="gdou-link-sum" style="font-size:13px;opacity:.8;margin-bottom:6px">读取中…</div>' +
			'<div style="border:1px solid rgba(128,128,128,.22);border-radius:8px;overflow:hidden">' +
			'<table class="table" style="width:100%;font-size:12.5px;margin:0">' +
			'<thead><tr><th>链路</th><th>账号</th><th>IP</th><th>状态</th>'+
				'<th style="width:210px">操作</th></tr></thead>' +
			'<tbody id="gdou-link-body"><tr><td colspan="5" style="opacity:.6">读取中…</td></tr></tbody>' +
			'</table>' +
			'</div>' +
			'<div style="font-size:12px;opacity:.6;margin-top:6px">' +
			'主链路 = 路由器本机 WAN；mcv0 / mcv1… 是按配置自动建立的虚拟链路（每条占一个设备额度）。'+
				'<br>每行的「重连」= 只对这一条链路重新认证；「换 MAC/IP」= 换掉它的 MAC 并重新 DHCP。'+
				'含主链路最多 4 条。</div>' +
			'</div>';

		/* ---------------- 校园网在线设备 ---------------- */
		title('校园网在线设备');
		var portalO = s.option(form.DummyValue, '_portal', null);
		portalO.rawhtml = true;
		portalO.default =
			'<div style="margin:2px 0 10px">' +
			'<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:8px">' +
			'<span id="gdou-pcount" style="font-size:30px;font-weight:600;line-height:1">—</span>' +
			'<span style="font-size:13px;opacity:.7">台设备在线（学校侧统计）</span>' +
			'<span id="gdou-pnote" style="font-size:12.5px;opacity:.65"></span>' +
			'<button type="button" id="gdou-p-refresh" class="btn cbi-button" ' +
				'style="margin-left:auto">刷新</button>' +
			'</div>' +
			'<div style="border:1px solid rgba(128,128,128,.22);border-radius:8px;overflow:hidden">' +
			'<table class="table" style="width:100%;font-size:12.5px;margin:0">' +
			'<thead><tr><th>IP</th><th>系统</th><th>设备类别</th><th>会话 ID</th></tr></thead>' +
			'<tbody id="gdou-p-body"><tr><td colspan="4" style="opacity:.6">读取中…</td></tr></tbody>' +
			'</table>' +
			'</div>' +
			'<div style="font-size:12px;opacity:.6;margin-top:6px">' +
			'套餐限同时在线设备数，超过会把旧会话顶下线。局域网里挂多少台设备都不影响这个数字。</div>' +
			'</div>';

		/* ---------------- 快捷操作 ---------------- */
		title('快捷操作');
		var actO = s.option(form.DummyValue, '_quick', null);
		actO.rawhtml = true;
		actO.default =
			'<div style="margin:2px 0 6px">' +
			'<button class="btn cbi-button cbi-button-apply" data-gd-qact="login">立即认证</button> ' +
			'<button class="btn cbi-button" data-gd-qact="logout">立即下线</button> ' +
			'<button class="btn cbi-button cbi-button-apply" data-gd-qact="renew">立即重连</button>' +
			'</div>' +
			'<pre id="gdou-q-result" style="white-space:pre-wrap;font-size:12px;margin:0"></pre>';

		return m.render().then(function (node) {
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
				bar.dot.style.background = up ? '#2e7d32' : (info ? '#c62828' : '#999');
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
					? '<span style="color:#2e7d32">● ' + textOn + '</span>'
					: '<span style="color:#c62828">● ' + textOff + '</span>';
			}

			function paintLinks(info, dual) {
				if (!lb) return;
				var rows = [];

				function ops(iface, offline) {
					return '<td style="white-space:nowrap">' +
						'<button class="btn cbi-button cbi-button-apply" style="padding:2px 7px;font-size:11px" ' +
							'data-gd-lop="reauth" data-gd-liface="' + esc(iface) + '">重连</button> ' +
						'<button class="btn cbi-button" style="padding:2px 7px;font-size:11px" ' +
							'data-gd-lop="refresh" data-gd-liface="' + esc(iface) + '">换 MAC/IP</button> ' +
						(offline
							? '<span style="opacity:.6;font-size:11px">已下线</span>'
							: '<button class="btn cbi-button" style="padding:2px 7px;font-size:11px;color:#c62828" ' +
								'data-gd-lop="offline" data-gd-liface="' + esc(iface) + '">下线</button>') +
						'</td>';
				}

				rows.push('<tr><td><b>主链路</b></td>' +
					'<td style="font-family:ui-monospace,monospace">' +
						esc((info && info.user) || '—') + '</td>' +
					'<td style="font-family:ui-monospace,monospace">' + esc((info && info.ip) || '—') + '</td>' +
					'<td>' + ((info && info.online) ? badge(true, '已认证', '') : badge(false, '', '未认证')) + '</td>' +
					ops('main', !!((dual && dual.main_offline))) + '</tr>');

				var existing = (dual && dual.existing) || [];
				existing.forEach(function (x) {
					var state = x.authed ? badge(true, '已认证', '')
						: (x.data_ok ? badge(false, '', '未认证') : badge(false, '', '数据不通'));
					rows.push('<tr><td><b>' + esc(x.iface.toUpperCase()) + '</b></td>' +
						'<td style="font-family:ui-monospace,monospace">' + esc(x.account || '—') + '</td>' +
						'<td style="font-family:ui-monospace,monospace">' + esc(x.ip || '—') + '</td>' +
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
