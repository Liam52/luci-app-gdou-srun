'use strict';
'require view';
'require form';
'require fs';

/*
 * 说明：这里全部使用 form.TypedSection（按 section 类型匹配）。
 * 早期版本用 NamedSection 按「节名」精确匹配，一旦节名与页面预期不符，
 * 页面能打开但所有输入框都不显示。类型匹配不受节名影响。
 * 分组标题用 DummyValue 绘制，不依赖 section 头。
 */

function hhmmError(value) {
	if (!/^[0-9]{4}$/.test(value)) return '需 4 位数字';
	var h = parseInt(value.substr(0, 2), 10);
	var m = parseInt(value.substr(2, 2), 10);
	if (h > 23 || m > 59) return '超出范围';
	return true;
}

function timesValidate(section_id, value) {
	if (value == null || value.trim() === '') return '至少填一个时刻';
	var parts = value.replace(/,/g, ' ').split(/\s+/).filter(function (s) { return s !== ''; });
	if (parts.length === 0) return '至少填一个时刻';
	for (var i = 0; i < parts.length; i++) {
		var err = hhmmError(parts[i]);
		if (err !== true) return '「' + parts[i] + '」' + err;
	}
	return true;
}

function heading(text) {
	return '<div style="font-weight:600;margin:14px 0 4px;padding-bottom:4px;' +
		'border-bottom:1px solid rgba(128,128,128,.25)">' + text + '</div>';
}

return view.extend({
	render: function () {
		var m = new form.Map('gdou-srun', '基础设置',
			'日常配置：账号、双链路、定时重连、MAC、ac_id。账号状态在「首页」，从账号在高阶设置。'
			+ '　【界面 1.9 · 按类型匹配】');

		/* 唯一的一个表单分区：按类型匹配，节名无关 */
		var s = m.section(form.TypedSection, 'gdou_srun', '设置');
		s.anonymous = true;
		s.addremove = false;

		var dummySeq = 0;

		function help(text) {
			dummySeq++;
			var o = s.option(form.DummyValue, '_help' + dummySeq, null);
			o.rawhtml = true;
			o.default = '<div style="opacity:.72;font-size:92%;margin:2px 0 6px">' + text + '</div>';
			return o;
		}

		function title(text) {
			dummySeq++;
			var o = s.option(form.DummyValue, '_head' + dummySeq, null);
			o.rawhtml = true;
			o.default = heading(text);
			return o;
		}

		var o;

		/* ---------------- 账号 ---------------- */
		title('账号');

		o = s.option(form.Flag, 'enabled', '启用自动认证');
		o.default = '1';
		o.rmempty = false;

		o = s.option(form.Value, 'username', '校园网账号',
			'通常为学号。');
		o.placeholder = '例如 20240001';
		o.rmempty = false;

		o = s.option(form.Value, 'password', '密码',
			'校园网密码，不是 WiFi 密码。');
		o.password = true;
		o.rmempty = false;

		/* ---------------- 双链路聚合 ---------------- */
		title('双链路聚合');
		help('在主链路之外再开一条虚拟链路，用同一份或另一份凭据再认证一次，' +
			'由多 WAN 按连接分流。<b>叠加的是总吞吐</b>（多任务、多设备），单条连接不会变快。<br>' +
			'勾选后会弹出风险确认框。');

		o = s.option(form.Flag, 'dual_same_account', '主账号也开双链路',
			'用上面的主账号在两条链路各登录一次，占 2 个设备额度。勾选时会再次确认。');
		o.default = '0';
		o.rmempty = false;

		o = s.option(form.ListValue, 'split_mode', '聚合模式',
			'决定两条链路怎么分担流量。只有存在第二条链路时才生效。');
		o.value('backup', '网络备份');
		o.value('conn', '负载均衡');
		o.value('dev', '链路聚合');
		o.default = 'backup';
		o.rmempty = false;

		help('<div style="font-size:12px;line-height:1.75;opacity:.82;margin-top:2px">' +
			'<b>各模式效果</b><br>' +
			'· <b>网络备份</b>：平时所有流量只走主链路，第二条链路保持认证待命。' +
				'主链路一旦掉线（断网/被踢），自动把局域网流量切到第二条链路，' +
				'让你继续上网；之后<b>每 10 分钟</b>尝试恢复主链路，恢复后自动切回。<br>' +
			'· <b>负载均衡</b>：每来一条新连接就换一条链路，两条链路 50:50 交替。' +
				'多线程下载、BT、多台设备同时上网时两条链路都会被用上；' +
				'<b>单个连接仍只走一条链路</b>，所以单文件下载不会变快。<br>' +
			'· <b>链路聚合</b>：局域网 IP 后半段（.128~.255）的设备整体走第二条链路，前半段走主链路。' +
				'适合让两拨设备互不抢带宽。<br>' +
			'<br><span style="opacity:.85">注意：以上都需要先把第二条链路建起来（勾选「主账号也开双链路」或在高级设置里启用从账号）。' +
			'实测本线带宽在 90~410 Mbps 之间大幅波动，聚合带来的连接分布改善有限。</span></div>');

		help('多个从账号的配置、以及每个从账号单独开双链路，在 <b>高阶设置</b> 标签页里。');

		/* ---------------- 定时重连 ---------------- */
		title('定时重连');

		o = s.option(form.Flag, 'renew_enable', '启用定时重连',
			'到点主动下线，等待若干秒后自动重新登录，用于刷新会话。');
		o.default = '1';
		o.rmempty = false;

		o = s.option(form.Value, 'renew_times', '重连时刻',
			'24 小时制 4 位数字，可填多个，空格或逗号分隔。');
		o.default = '0500 1300 2000';
		o.placeholder = '0500 1300 2000';
		o.rmempty = false;
		o.validate = timesValidate;

		o = s.option(form.Value, 'renew_gap', '下线等待（秒）',
			'下线后等多久再重新登录，默认 5 秒。期间会断网。');
		o.default = '5';
		o.datatype = 'range(2,60)';

		/* ---------------- MAC 地址 ---------------- */
		title('MAC 地址');

		o = s.option(form.Flag, 'mac_refresh', '认证前轮换 MAC',
			'每次准备认证时，先换一个 MAC 再重新获取 IP 并登录。不影响已在线状态。');
		o.default = '0';
		o.rmempty = false;

		o = s.option(form.ListValue, 'mac_mode', '生成方式');
		o.default = 'pool';
		o.value('pool', 'MAC 池：5 个地址随机轮换（推荐）');
		o.value('poolrandom', 'MAC 池：5 个完全随机地址轮换');
		o.value('oui', '单个：保留原厂商前缀');
		o.value('random', '单个：完全随机');
		o.rmempty = false;

		o = s.option(form.Value, 'mac_gap', '轮换最小间隔（秒）',
			'两次轮换之间至少间隔多久，防止连续重试时反复换 MAC。默认 300 秒。');
		o.default = '300';
		o.datatype = 'range(60,86400)';

		/* ---------------- 检测与重试 ---------------- */
		title('检测与重试');

		o = s.option(form.Value, 'interval', '检测间隔（秒）',
			'每隔多久检查一次联网状态。');
		o.default = '1';
		o.datatype = 'range(1,3600)';

		o = s.option(form.Value, 'login_cooldown', '认证冷却（秒）',
			'两次认证尝试之间的最小间隔，避免被服务器限流。');
		o.default = '10';
		o.datatype = 'range(5,600)';

		/* ---------------- 接入设备 ---------------- */
		title('接入设备 ac_id');

		o = s.option(form.Value, 'manual_acid', '手动指定',
			'留空则自动识别。不同楼栋可能不同。');
		o.datatype = 'uinteger';

		o = s.option(form.Value, 'acid', '兜底值',
			'自动识别失败时使用。');
		o.default = '25';
		o.datatype = 'uinteger';

		o = s.option(form.Value, 'server', '认证服务器');
		o.default = 'http://10.129.1.1';
		o.rmempty = false;

		o = s.option(form.Flag, 'auto_agree', '自动同意上网协议',
			'登录前若协议未同意则自动绑定。');
		o.default = '1';
		o.rmempty = false;

		/* ---------------- 上报标识 ---------------- */
		title('上报标识');
		help('登录时提交给门户的 os / name 字段。门户会原样记录进在线设备列表，留空则用默认值。');

		o = s.option(form.Value, 'portal_name', '设备名 (name)',
			'显示在门户在线设备列表里。');
		o.default = 'Huawei';
		o.placeholder = 'Huawei';

		o = s.option(form.Value, 'portal_os', '系统名 (os)');
		o.default = 'HarmonyOS';
		o.placeholder = 'HarmonyOS';

		/* ---------------- 手动操作 ---------------- */
		title('手动操作');

		o = s.option(form.Flag, 'auto_apply', '保存后自动重建连接',
			'默认关闭。开启后：改动主账号、从账号或多链路设置并保存，' +
			'约 5~10 秒内自动下线全部连接、再按新配置重连（期间断网十几秒）。' +
			'关闭时只记录变更，需要你点下面的「立即重连」才会重建。');
		o.default = '0';
		o.rmempty = false;

		dummySeq++;
		o = s.option(form.DummyValue, '_actions' + dummySeq, null);
		o.rawhtml = true;
		o.default =
			'<div style="margin:2px 0 6px">' +
			'<button class="btn cbi-button cbi-button-apply" data-gd-act="login">立即认证</button> ' +
			'<button class="btn cbi-button" data-gd-act="logout">立即下线</button> ' +
			'<button class="btn cbi-button cbi-button-apply" data-gd-act="apply">立即重连</button> ' +
			'<button class="btn cbi-button" data-gd-act="mac">刷新 MAC</button> ' +
			'<button class="btn cbi-button" data-gd-act="macrestore">恢复原始 MAC</button> ' +
			'<button class="btn cbi-button" data-gd-act="macpool">重建 MAC 池</button>' +
			'</div>' +
			'<pre id="gdou-act-result" style="white-space:pre-wrap;font-size:12px;margin:0"></pre>';

		help('到点重连与刷新 MAC 都会短暂断网；改完记得点页面底部「保存并应用」。');

		/* ---------------- 高阶设置（放在最底部）---------------- */
		title('高阶设置');
		help('<div style="padding:10px 12px;border-radius:8px;background:rgba(198,40,40,.10);' +
			'border:1px solid rgba(198,40,40,.38);color:#b71c1c;font-size:12.5px;line-height:1.7">' +
			'<b>⚠ 实验性功能，会改变网络结构。</b><br>' +
			'· 每条链路占一个<b>设备额度</b>，套餐设备数超限会把你正在用的设备顶下线；<br>' +
			'· 同一网口出现多个 MAC / IP，可能触发学校的<b>端口安全或共享检测</b>，最坏情况是网口被临时禁用；<br>' +
			'· 填写他人账号可能违反校规，并连累对方账号被处理；<br>' +
			'· 出错时可能导致<b>整机断网</b>，需要断电重启才能恢复。</div>');

		o = s.option(form.Flag, 'advanced', '启用高阶设置',
			'勾选后才显示「双链路聚合」，并解锁高阶设置标签页里的从账号配置。');
		o.default = '0';
		o.rmempty = false;

		help('勾选并保存后，到 <b>高阶设置</b> 标签页配置最多 4 个从账号（每个都可单独开双链路），' +
			'那里还有链路计划预览与「建立 / 拆除」按钮。');

		return m.render().then(function (node) {
			/* ---------- 双链路：勾选时弹风险确认 ---------- */
			var dualBox = node.querySelector('[name="cbid.gdou-srun.gdou_srun.dual_same_account"]') ||
				node.querySelector('#cbid\.gdou-srun\.gdou_srun\.dual_same_account');
			if (dualBox) {
				dualBox.addEventListener('change', function () {
					if (!dualBox.checked) return;
					var ok = window.confirm(
						'开启双链路会：\n\n' +
						'· 再占用 1 个设备额度（套餐超限会顶掉你正在用的设备）\n' +
						'· 在同一网口上产生第二个 MAC 与 IP\n' +
						'· 可能触发学校的端口安全或共享检测，最坏情况是网口被临时禁用\n' +
						'· 出错时可能导致整机断网\n\n' +
						'确认开启吗？');
					if (!ok) {
						dualBox.checked = false;
						var ev = document.createEvent('HTMLEvents');
						ev.initEvent('change', true, false);
						dualBox.dispatchEvent(ev);
					}
				});
			}


			var out = node.querySelector('#gdou-act-result');
			var buttons = node.querySelectorAll('[data-gd-act]');

			Array.prototype.forEach.call(buttons, function (btn) {
				btn.addEventListener('click', function () {
					var act = btn.getAttribute('data-gd-act');
					var script = '/usr/libexec/gdou-srun';
					var args = [ act ];

					if (act === 'apply') {
						// 完整重建：拆链路 -> 登出 -> 按新配置登录 -> 重建链路
						script = '/usr/libexec/gdou-srun-apply';
						args = [];
					} else if (act === 'renew') {
						var gap = node.querySelector('[name="cbid.gdou-srun.gdou_srun.renew_gap"]');
						args.push(gap && gap.value ? gap.value : '5');
					} else if (act === 'mac') {
						script = '/usr/libexec/gdou-srun-mac';
						args = [ 'refresh' ];
					} else if (act === 'macrestore') {
						script = '/usr/libexec/gdou-srun-mac';
						args = [ 'restore' ];
					} else if (act === 'macpool') {
						script = '/usr/libexec/gdou-srun-mac';
						args = [ 'pool-reset' ];
					}

					if (out) {
						out.style.color = '';
						out.textContent = '正在执行 ' + act + ' ...';
					}
					Array.prototype.forEach.call(buttons, function (b) { b.disabled = true; });

					fs.exec(script, args).then(function (res) {
						var text = ((res && res.stdout) || '').trim() ||
							((res && res.stderr) || '').trim() || '（无输出）';
						if (out) {
							out.textContent = text;
							out.style.color = text.indexOf('"ok": true') >= 0 ? '#2e7d32' : '#c62828';
						}
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
