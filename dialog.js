/*
 * Create modal dialogs.
 * The dialog plugin does not work on an element.
 */

(function($) {
	'use strict';
	var dialogs = {}, 
		global_options = {
			buttons : null,
			title : null,
			titleAlign : 'center',
			buttonAlign : 'center',
			bodyAlign : 'center',
			buttonNoBorder : true,
			buttonBorderRadius : true,
			autoClose : 0,
			onOpen : null,
			onClose : null,
			replaceAlert : false,
			bgWhite : false
		},
		dialog_count = 0;
	$.MWIN = (function() {
		var events_map = {}
		function extend(a, b){
			if(arguments.length<2) return null;
			var arg = null;
			for(var i=1;i<arguments.length;i++){
				arg = arguments[i];
				for(var c in arg){
					if(!arg.hasOwnProperty(c)) continue;
					a[c] = arg[c];
				}
			}
			return a;
		};
		function get_target(e){
			if(!e) return document;
			var target = e.target;
			if(!target) target = e.srcElement;
			if(target.nodeType === 3) target = target.parentNode;
			return target || document;
		};
		function on(ele, ev, handler, cap){
			if(ele.addEventListener){
				ele.addEventListener(ev, handler, cap===true);
			}else if(ele.attachEvent){
				ele.attachEvent("on" + ev, handler);
			}else{
				ele["on" + ev] = handler;
			}
			var id = ele == document ? 'dlg-body' : ele.getAttribute('data-id');
			if(!id){
				id = 'dlg-' + Math.random().toString().substr(2);
				ele.setAttribute('data-id', id);
			}
			if(!events_map[id]) events_map[id] = {};
			if(!events_map[id][ev]) events_map[id][ev] = [];
			events_map[id][ev].push(handler);
		};
		function off_one(ele, ev, handler, cap){
			if(ele.removeEventListener){
				ele.removeEventListener(ev, handler, cap===true);
			}else if(ele.detachEvent){
				ele.detachEvent("on" + ev, handler);
			}else{
				ele["on" + ev] = null;
			}
		}
		function off(ele, ev, handler, cap){
			var id = ele == document ? 'dlg-body' : ele.getAttribute('data-id');
			if(!id) return;
			if(!events_map[id] || !events_map[id][ev]) return;
			var maps = events_map[id][ev];
			if(handler === undefined || typeof handler == 'boolean'){
				if(typeof handler == 'boolean') cap = handler;
				while(maps.length>0){
					off_one(ele, ev, maps.pop(), cap);
				}
				events_map[id][ev] = null;
				return;
			}else{
				var _index = -1;
				for(var i=0;i<maps.length;i++){
					if(maps[i] == handler){
						_index = i;
						break;
					}
				}
				if(_index == -1) return;
				maps.splice(_index, 1);
				if(maps.length ==0) events_map[id][ev] = null;
				off_one(ele, ev, handler, cap);
			}
		};
		function create_exp(e){if(e && typeof e == 'object') return e;return new RegExp('\\b(' + e.replace(/\-/g, '\\-').replace(/\s+/g, '|') + ')\\b','g');};
		function add_class(src, cls_name, str){
			src.className = ((src.className || "").replace(create_exp(cls_name), '') + " " + (str || cls_name)).replace(/\s+/g, ' ').replace(/(^\s+|\s+$)/g,"");
		};
		function remove_class(src, cls_name){
			src.className = (src.className || "").replace(create_exp(cls_name), '').replace(/\s+/g, ' ').replace(/(^\s+|\s+$)/g,"");
		};
		function has_class(src, cls_name){
			return create_exp(cls_name).test(src.className || "");
		};
		function toggle_class(src, cls_name){
			var exp = create_exp(cls_name), has = has_class(src, exp);
			if(has) remove_class(src, exp)
			else add_class(src, exp, cls_name);
			return has;
		};
		function isFunction(fn){
			return fn && typeof fn == 'function';
		};
		function next(src){
			src = src.nextSibling;
			while(src && src.nodeType != 1){
				src = src.nextSibling;
			}
			return src;
		}
		function prev(src){
			src = src.previousSibling;
			while(src && src.nodeType != 1){
				src = src.previousSibling;
			}
			return src;
		}
		function first(src){
			src = src.firstChild;
			if(src && src.nodeType != 1){
				src = next(src);
			}
			return src;
		}
		function last(src){
			src = src.lastChild;
			if(src && src.nodeType != 1){
				src = prev(src);
			}
			return src;
		}
		function dlg_ins(name, ele, title, body, buttons, options){
			this.name = name;
			this.main = ele;
			this.title = title;
			this.body = body;
			this.buttonset = buttons;
			this.options = options;
			this.callbacks = null;
			this.args = null;
		}
		dlg_ins.prototype.close = function(ev){
			if(typeof ev == 'number') ev = this.callbacks ? (this.callbacks[ev] || null) : null;
			close(this.name, ev);
		};
		dlg_ins.prototype.open = function(){
			return dlg.apply(window, this.args || arguments);
		};
		dlg_ins.prototype.setTitle = function(title){
			if(title === null){
				this.title.style.display = 'none';
				add_class(this.body, "dlg-body-notitle");
			}else{
				this.title.style.display = 'block';
				this.title.innerHTML = wapper(title);
				remove_class(this.body, "dlg-body-notitle");
			}
		};
		dlg_ins.prototype.content = function(html){
			if(html === undefined){
				return first(this.body).innerHTML;
			}else{
				this.body.innerHTML = wapper(html);
			}
		};
		dlg_ins.prototype.fix = function(offset){
			var height = this.main.offsetHeight;
			var p = this.title.parentNode;
			var height2 = p.offsetHeight;
			if(height && height2){
				var m = Math.floor((height-height2) / 2 - offset);
				if(m<=0) m = 100;
				p.style.marginTop = m + "px";
			}
		};
		function dlg(){
			var name = '', 
				content = '', 
				options = {},
				len = arguments.length, 
				arg;
				
			if(len == 0) return;
			for(var i=0;i<len;i++){
				arg = arguments[i];
				if(typeof arg == 'object') {
					extend(options, global_options, arg);
				}else if(typeof arg == "string"){
					if(content==''){
						content = arg;
					}else if(name=='') {
						name = content;
						content = arg;
					}else{
						return;
					}
				}
			}
			if(!name) name = 'dlg-' + Math.random().toString().substr(2);

			var ele = document.getElementById(name), _body, title, body, buttons;
			if(!ele){
				ele = document.createElement('div');
				ele.id = name;
				document.body.appendChild(ele);
			}
			ele.innerHTML = '<div class="dialog"><h1></h1><div class="dlg-body'  +  (options.icon?' with-icon':'') + '"></div><div class="button-sets"></div></div>';
			add_class(ele, 'blocker' + (options.bgWhite===true ? " white" : ""));
			_body = first(ele);
			title = first(_body);
			body = next(title);
			buttons = last(_body);
			body.innerHTML =  wapper((options.icon ? '<i class="icon icon-' + options.icon + '"></i>' : '') + (content || options.content || ''));

			_body.style.alpha='0';
			_body.style.opacity='0';
			_body.style.filter='alpha(opacity=0)';
			ele.style.display = 'block';
			var _dialog = new dlg_ins(name, ele, title, body, buttons, options); 
			_dialog.args = arguments;
			dialogs[name] = _dialog;
			fix_buttons(buttons, _dialog);
			if(options.title === null){
				title.style.display = 'none';
				add_class(body, "dlg-body-notitle");
			}else{
				title.style.display = 'block';
				title.innerHTML = wapper(options.title);
			}
			if(options.iconClose===true){
				var close_ico = document.createElement('i');
				close_ico.innerHTML='×';
				title.appendChild(close_ico);
				on(close_ico, 'click', function(){
					_dialog.close(_dialog.options.buttons? _dialog.options.buttons.length-1 : null);
				});
			}
			if(options.defaultWidth && !options.width){
				options.width = options.defaultWidth;
			}
			if(options.width){
				if(typeof options.width == 'number') options.width = options.width + 'px';
				_body.style.width = options.width;
			}
			if(options.height){
				if(typeof options.height == 'number'){
					options.height = (options.height - title.offsetHeight - buttons.offsetHeight) + 'px';
				}
				body.style.height = options.height;
			}
			if(options.autoClose && typeof options.autoClose == 'number'){
				window.setTimeout(function(){
					close(name, null);
				}, options.autoClose)
			}
			set_align(title, options.titleAlign);
			set_align(body, options.bodyAlign);
			set_align(buttons, options.buttonAlign);
			if(isFunction(options.onOpen)){
				options.onOpen.call(_dialog);
			}
			if(typeof options.autoFix == 'number'){
				_dialog.fix(options.autoFix);
			}
			_body.style.alpha='100%';
			_body.style.opacity='1';
			_body.style.filter='alpha(opacity=100%)';
			return _dialog;
		};
		function wapper(content){
			return '<div class="align-wapper">' + content + '</div>';
		}
		function set_align(ele, align){
			remove_class(ele, 'align-left align-center align-right');
			add_class(ele, 'align-' + align);
		}
		function close(e, ev){
			var ele = find_element(e);
			if(!ele) return;
			var _dialog = dialogs[e];
			if(_dialog){
				if(ev){
					if(isFunction(ev['callback'])){
						if(ev['callback'].call(e, ev.data) === false){
							return;
						}
					}
				}
				if(isFunction(_dialog.options.onClose)){
					if(_dialog.options.onClose.call(_dialog, ev) === false){
						return;
					}
				}
				var buttons = _dialog.buttonset;
				if(buttons){
					off(buttons, 'click');
				}
			}
			ele.parentNode.removeChild(ele);
			dialogs[e] = null;
		};
		function fix_events(ev, code, type){
			on(document, ev, function(e){
				e = e || event;
				if(!e){
					return;
				}
				var key = e.keyCode || e.witch;
				if(!key){
					return;
				}
				if(key != code){
					return;
				}
				var last_ = last(document.body);
				if(!has_class(last_, 'blocker')){
					return ;
				}
				var _dialog = dialogs[last_.id];
				if(!_dialog) {
					return;
				}
				var map = _dialog.callbacks;
				if(!map){
					return;
				}
				for(var i=0;i<map.length;i++){
					if(map[i] && map[i][type] === true) {
						close(_dialog.name, map[i]);
						break;
					}
				}
			});
		};
		function fix_buttons(buttons, _dialog){
			var _buttons = _dialog.options.buttons, name = _dialog.name;
			if(!_buttons || (typeof _buttons == 'object' && _buttons.constructor == Array && _buttons.length==0)) {
				buttons.style.display = 'none';
			}else if(typeof _buttons == 'object') {
				var map = _buttons;
				if(_buttons.constructor != Array){
					map = [];
					var className = null, index = 0, fn = null;
					for(var btn in _buttons){
						if(!_buttons.hasOwnProperty(btn)) continue;
						fn = _buttons[btn];
						className = typeof fn == 'string' ? fn : null;
						index = btn.lastIndexOf('.');
						if(index>0 && btn.substr(index-1, 1) != "\\") {
							className = btn.substr(index+1);
							btn = btn.substr(0, index);
						}
						btn = btn.replace(/\\\./g, '.');
						map.push({
							title : btn,
							callback : typeof fn == 'string' ? null : fn,
							className : className,
							data : null,
							isDefault : false,
							isCancel : false,
							index : map.length
						});
					}
				}
				if(map.length == 0) {
					buttons.style.display = 'none';
				}else{
					buttons.style.display = 'block';
					add_class(buttons, 'button-count-' + map.length);
					var html = '', btn, defaultBtn = -1, classes=[];
					for(var i=0;i<map.length;i++){
						btn = map[i];
						if(btn.isDefault===true) defaultBtn = i;
						classes = [btn.className ? btn.className : 'btn-primary'];
						if(i == 0 ){
							classes.push('btn-index-first');
						}else if(i == map.length - 1 ){
							classes.push('btn-index-last');
						}else{
							classes.push('btn-index-middle');
						}
						if(_dialog.options.buttonNoBorder !== false) classes.push('no-border');
						if(_dialog.options.buttonBorderRadius === true) classes.push('btn-radius');
						html += '<button class="' + classes.join(' ') + '" data-value="' + i + '">' + btn.title + '</button>';
					}
					buttons.innerHTML = wapper(html);
					if(defaultBtn >=0 ) buttons.getElementsByTagName('button')[defaultBtn].focus();
					on(buttons, 'click', function(e){
						var ev = find_ev(e, name);
						if(!ev) {
							return;
						}
						close(name, ev);
					});
					_dialog['callbacks'] = map;
				}
			}
		};
		function find_ev(e, name){
			e = get_target(e || event);
			if(e && e.nodeName && e.nodeName.toLowerCase() != 'button') {
				return null;
			}
			var value = e.getAttribute('data-value');
			if(value === undefined) {
				return null;
			}
			var map;
			if(!dialogs[name] || !(map = dialogs[name]['callbacks'])) return null;
			value = parseInt(value);
			if(!map[value]){
				return null;
			}
			return map[value];
		};
		function find_element(e){
			var ele = document.getElementById(e);
			if(!ele){
				if(dialogs[e]) {
					dialogs[e] = null;
				}
				return null;
			}
			return ele;
		};

		
		function tips() {
			var title = null, 
				content = '', 
				len = arguments.length, 
				arg, options = {},
				autoClose = 0;
				
			if(len == 0) return;
			for(var i=0;i<len;i++){
				arg = arguments[i];
				if(typeof arg == 'number') {
					autoClose = arg;
				}else if(typeof arg == 'object') {
					options = arg;
				}else if(typeof arg == "string"){
					if(content==''){
						content = arg;
					}else{
						title = arg;
					}
				}
			}
			if(!title && !options.hasOwnProperty('title')) title = "提示";
			return dlg('tips', content, extend(options, {
				title : title || options.title,
				autoClose : autoClose,
				buttons : null
			}));
		}
		tips.html = function(msg){html('tips', msg);};
		tips.title = function(msg){title('tips', msg);};

		var _alert = window.alert;
		function alert() {
			var title = '', 
				content = '', 
				callback = null,
				len = arguments.length, 
				arg, options = {};
				
			if(len == 0) return;
			for(var i=0;i<len;i++){
				arg = arguments[i];
				if(isFunction(arg)) {
					callback = arg;
				}else if(typeof arg == 'object') {
					options = arg;
				}else if(typeof arg == "string"){
					if(content==''){
						content = arg;
					}else{
						title = arg;
					}
				}
			}
			if(!title && !options.hasOwnProperty('title')) title = "信息提示";
			var buttons = [{
				isCancel : true,
				title : options.buttonText || "确定",
				callback : callback || options.callback
			}];
			if(options.buttons === false){
				buttons = null;
			}
			return dlg('alert', content, extend(options, {
				title : title || options.title,
				buttons : buttons
			}));
		}
		alert.html = function(msg){html('alert', msg);};
		alert.title = function(msg){title('alert', msg);};
		alert.restore = function(){window.alert = _alert;global_options.replaceAlert=false;};
		if(global_options.replaceAlert === true){
			window.alert = alert;
		}
		function confirm() {
			var title = '', 
				content = '', 
				onConfirm = null,
				onCancel = null,
				cancelFirst = null,
				len = arguments.length, 
				arg, options = {};
				
			if(len == 0) return;
			for(var i=0;i<len;i++){
				arg = arguments[i];
				if(isFunction(arg)) {
					if(!onConfirm){
						onConfirm = arg;
					}else{
						onCancel = arg;
					}
				}else if(typeof arg == 'object') {
					options = arg;
				}else if(typeof arg == 'boolean') {
					cancelFirst = arg;
				}else if(typeof arg == "string"){
					if(content==''){
						content = arg;
					}else{
						title = arg;
					}
				}
			}
			if(!title && !options.hasOwnProperty('title')) title = "信息确认";
			var buttons = [{
				title : options.buttonTextOk || "确定",
				callback : onConfirm || options.onConfirm
			},{
				isCancel : true,
				title : options.buttonTextCancel || "取消",
				callback : onCancel || options.onCancel,
				className : "btn-grey"
			}];
			if(cancelFirst ===true || options.cancelFirst === true) buttons.reverse();
			if(options.buttons === false){
				buttons = null;
			}
			return dlg(options.name || 'confirm', content, extend(options, {
				title : title || options.title,
				buttons : buttons
			}));
		}
		confirm.html = function(msg){html('confirm', msg);};
		confirm.title = function(msg){title('confirm', msg);};
		
		function prompt() {
			var title = '', 
				callback = null,
				len = arguments.length, 
				arg, options = {};
				
			if(len == 0) return;
			for(var i=0;i<len;i++){
				arg = arguments[i];
				if(isFunction(arg)) {
					callback = arg;
				}else if(typeof arg == 'object') {
					options = arg;
				}else if(typeof arg == "string"){
					title = arg;
				}
			}
			callback = callback || options.callback;
			var _id = 'input-prompt-' + dialog_count;
			options.width = options.width || "350px";
			return dlg('prompt', '<input id="' + _id + '" class="input-prompt" type="text" />', extend(options, {
				title : title || options.title,
				buttons : [{
					title : options.buttonText || "确定",
					callback : function(){
						if(isFunction(callback)){
							return callback.call(this, document.getElementById(_id).value);
						}
					}
				},{
					isCancel : true,
					title : options.buttonTextCancel || "取消",
					callback : options.onCancel,
					className : "btn-grey"
				}
			]
			}));
		}
		prompt.title = function(msg){title('prompt', msg);};
		
		function html(name, val) {
			var _dialog = dialogs[name];
			if(!_dialog) return;
			_dialog.body.innerHTML = wapper(val);
		};
		function title(name, val){
			var _dialog = dialogs[name];
			if(!_dialog) return;
			_dialog.title.innerHTML = wapper(val);
		};
		fix_events('keydown', 13, 'isDefault');
		fix_events('keyup', 27, 'isCancel');
		return {
			any : dlg,
			open: dlg,
			close: close,
			tips : tips,
			alert: alert,
			confirm: confirm,
			html : html,
			prompt : prompt,
			title : title,
			options : function(key, value){
				if(value === undefined) return global_options[key];
				global_options[key] = value;
				if(key == 'replaceAlert'){
					if(value === true){
						window.alert = alert;
					}else{
						window.alert = _alert;
					}
				}
				return this;
			}
		};
	}());
}(window));
