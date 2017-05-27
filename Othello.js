"use strict";

function Chessboard()
{
	var oo = this;

	var pieces;	
	var piecesnum;
	var side

	oo.toDown = null;

	function bindEvent(td)
	{
		for(var i=0; i<64; i++)
			(function (i){
				td[i].onclick = function (){
					if (pieces[i].className=="prompt")
						oo.toDown(i);
				}
			})(i);
		td = undefined;
	}

	oo.create = function ()	
	{
		var obj = document.getElementById("chessboard");
		var html = "<table>";
		for (var i=0; i<8; i++)
		{
			html += "<tr>";
			for (var j=0; j<8; j++)
				html += "<td class='bg"+(j+i)%2+"'><div></div></td>";
			html += "</tr>";
		}
		html += "</table>";
		obj.innerHTML = html;
		pieces = obj.getElementsByTagName("div");
		bindEvent(obj.getElementsByTagName("td"));

		piecesnum = document.getElementById("right").getElementsByTagName("span");
		side = {
			"1": document.getElementById("side1"),
			"-1": document.getElementById("side2")
		};
	}

	oo.update = function (m,nop)
	{
		for (var i=0; i<64; i++)
			pieces[i].className = ["white","","black"][m[i]+1];
		if (!nop)
			for (var n in m.next)
				pieces[n].className = "prompt";
		for (var i=0; i<m.newRev.length; i++)
			pieces[m.newRev[i]].className += " reversal";
		if (m.newPos!=-1)
			pieces[m.newPos].className += " newest";
		piecesnum[0].innerHTML = m.black;
		piecesnum[1].innerHTML = m.white;
		side[m.side].className = "cbox side";
		side[-m.side].className = "cbox";
	}
}


function AI()
{
	var oo = this;

	oo.calculateTime = 1000;
	oo.outcomeDepth = 14;	
	var outcomeCoarse = 15;	
	var maxDepth;
	var outTime;

	var weight = [6,11,2,2,3]; 

	var rnd = [		
		{s: 0,a: 1,b: 8,c: 9,dr:[1,8]},
		{s: 7,a: 6,b:15,c:14,dr:[-1,8]},
		{s:56,a:57,b:48,c:49,dr:[1,-8]},
		{s:63,a:62,b:55,c:54,dr:[-1,-8]}
	];

	oo.history = [[],[]];			
	for (var i=0; i<2; i++)
		for (var j=0; j<=60; j++)
			oo.history[i][j] = [0,63,7,56,37,26,20,43,19,29,34,44,21,42,45,18,2,61,23,40,5,58,47,16,10,53,22,41,13,46,17,50,51,52,12,11,30,38,25,33,4,3,59,60,39,31,24,32,1,62,15,48,8,55,6,57,9,54,14,49];

	var hash = new Transposition();

	function sgn(n)
	{
		return n>0?1:n<0?-1:0;
	}


	function evaluation(m)			
	{
		var corner = 0, steady = 0, uk = {};
		for (var i=0,v,l = rnd.length; v = rnd[i],i<l; i++)
		{
			if (m[v.s]==0)			
			{
				corner += m[v.a] * -3;		
				corner += m[v.b] * -3;		
				corner += m[v.c] * -6;		
				continue;
			}
			corner += m[v.s] * 15;	
			steady += m[v.s];	
			for (var k = 0; k <2; k++)
			{
				if (uk[v.s+v.dr[k]])
					continue;
				var eb = true, tmp = 0;
				for (var j = 1; j <= 6; j++)
				{
					var t = m[v.s+v.dr[k]*j];
					if (t==0)
							break;
					else if (eb && t==m[v.s])
						steady += t;	
					else
					{
						eb = false;
						tmp += t;	
					}
				}
				if (j==7 && m[v.s+v.dr[k]*7]!=0)
				{
					steady += tmp;
					uk[v.s+v.dr[k]*6] = true;
				}
			}
		}

		var frontier = 0;	
		for (var i=9; i<=54; i+=(i&7)==6?3:1)
		{
			if (m[i]==0)
				continue;
			for (var j=0; j<8; j++)
				if (m[othe.dire(i,j)]==0)
				{
					frontier -= m[i];
					break;
				}
		}

		var mobility = (m.nextNum-m.prevNum)*m.side;

		var parity = m.space<18 ? (m.space%2==0?-m.side:m.side) : 0;	


		var rv = corner*weight[0] + steady*weight[1] + frontier*weight[2] + mobility*weight[3] + parity*weight[4];
		return rv * m.side;
	}

	function outcome(m)	
	{
		var s = m.black-m.white;
		if (maxDepth>=outcomeCoarse)
			return sgn(s)*10000*m.side;
		return (s+m.space*sgn(s))*10000*m.side;
	}

	oo.startSearch = function(m)		
	{
		
		var f = 0;
		if (m.space<=oo.outcomeDepth)
		{
			
			outTime = (new Date()).getTime()+600000;		
			maxDepth = m.space;
			
			if (maxDepth>=outcomeCoarse)
				f = alphaBeta(m, maxDepth, -Infinity, Infinity);
			else
				f = mtd(m, maxDepth, f);
			
			console.log("End-game search result：",maxDepth,m.space,m.side,f*m.side);
			return hash.getBest(m.key);
		}

		outTime = (new Date()).getTime()+oo.calculateTime;
		maxDepth = 0;
		
		try {
			while (maxDepth<m.space)
			{
				f = mtd(m, ++maxDepth, f);
				
				var best = hash.getBest(m.key);
				console.log(maxDepth,f*m.side,best);
			}
		} catch(eo){
			if (eo.message!="time out")		
				throw eo;					
		}
		
		console.log("Search result：",maxDepth-1,m.space,m.side,f*m.side);
		return best;
	}

	function mtd(m,depth,f)	
	{
		var lower = -Infinity;
		var upper = Infinity;
		do {
			var beta = (f==lower) ? f+1 : f;	
			f = alphaBeta(m, depth, beta-1, beta);	
			if (f < beta)
				upper = f;
			else
				lower = f;
		} while (lower < upper);
		if (f < beta)	
			f = alphaBeta(m, depth, f-1, f);
		return f;
	}

	function alphaBeta(m,depth,alpha,beta)		
	{
		if ((new Date()).getTime() > outTime)		
			throw new Error("time out");		

		var hv = hash.get(m.key,depth,alpha,beta);
		if (hv !== false)
			return hv;

		if (m.space==0)			
			return outcome(m);	
		othe.findLocation(m);
		if (m.nextNum==0)		
		{
			if (m.prevNum==0)		
				return outcome(m);		
			othe.pass(m);
			return -alphaBeta(m, depth, -beta, -alpha);
		}
		if (depth<=0)		
		{
			var e = evaluation(m);
			hash.set(m.key,e,depth,0,null);
			return e;
		}

		var hd = hash.getBest(m.key);
		if (hd!==null)
			moveToHead(m.nextIndex,hd);

		var hist = oo.history[m.side==1?0:1][m.space];
		var hashf = 1;			
		var bestVal = -Infinity;		
		var bestAct = null;			
		for (var i=0; i<m.nextNum; i++)
		{
			var n = m.nextIndex[i];
			var v = -alphaBeta(othe.newMap(m,n), depth-1, -beta, -alpha);
			if (v > bestVal)
			{
				bestVal = v;
				bestAct = n;
				if (v > alpha)
				{
					alpha = v;
					hashf = 0;
					moveToUp(hist,n);
				}
				if (v >= beta)
				{
					hashf = 2;
					break;	
				}
			}
		}
		moveToHead(hist,bestAct);
		hash.set(m.key,bestVal,depth,hashf,bestAct);
		return bestVal;
	}

	function moveToHead(arr,n)
	{
		if (arr[0]==n)
			return;
		var i = arr.indexOf(n);
		arr.splice(i,1);
		arr.unshift(n);
	}

	function moveToUp(arr,n)
	{
		if (arr[0]==n)
			return;
		var i = arr.indexOf(n);
		arr[i] = arr[i-1];
		arr[i-1] = n;
	}

}




function Transposition()
{
	var oo = this;

	var HASH_SIZE = (1 << 19) -1;		
	var data = new Array(HASH_SIZE+1);

	oo.set = function (key,eva,depth,flags,best)
	{
		var keyb = key[0]&HASH_SIZE;
		var phashe = data[keyb];
		if (!phashe)
			phashe = data[keyb] = {};
		else if (phashe.key == key[1] && phashe.depth > depth)	
			return;
		phashe.key = key[1];
		phashe.eva = eva;
		phashe.depth = depth;
		phashe.flags = flags;
		phashe.best = best;
	}

	oo.get = function (key,depth,alpha,beta)
	{
		var phashe = data[key[0]&HASH_SIZE];
		if ((!phashe) || phashe.key != key[1] || phashe.depth < depth)
			return false;
		switch (phashe.flags)
		{
			case 0:
				return phashe.eva;
			case 1:
				if (phashe.eva <= alpha)
					return phashe.eva;
				return false;
			case 2:
				if (phashe.eva >= beta)
					return phashe.eva;
				return false;
		}
	}

	oo.getBest = function (key)
	{
		var phashe = data[key[0]&HASH_SIZE];
		if ((!phashe) || phashe.key != key[1])
			return null;
		return phashe.best;
	}


}


function Zobrist()
{
	var oo = this;

	var swapSide = [rnd(),rnd()];
	var zarr = [[],[],[]];
	for (var pn=0; pn<64; pn++)
	{
		zarr[0][pn] = [rnd(),rnd()];
		zarr[1][pn] = [rnd(),rnd()];
		zarr[2][pn] = [zarr[0][pn][0]^zarr[1][pn][0], zarr[0][pn][1]^zarr[1][pn][1]];
	}

	function rnd()		
	{
		return (Math.random()*0x100000000)>>0;
	}

	oo.swap = function (key)		
	{
		key[0] ^= swapSide[0];
		key[1] ^= swapSide[1];
	}

	oo.set = function (key,pc,pn)	
	{
		key[0] ^= zarr[pc][pn][0];
		key[1] ^= zarr[pc][pn][1];
	}
}



function Othello()
{
	var oo = this;

	var map = [];		
	var history = [];	
	var aiRuning = false;	

	var zobrist = new Zobrist();

	oo.aiSide = 0;	

	oo.play = function ()	
	{
		if (aiRuning)
			return;
		console.clear();
		
		map = [];
		for (var i=0; i<64; i++)
			map[i] = 0;					
		map[28] = map[35] = 1;			
		map[27] = map[36] = -1;			
		map.black = map.white = 2;		
		map.space = 60;		
		map.frontier = [];	
		var tk = [18,19,20,21,26,29,34,37,42,43,44,45];
		for (var i=0; i<12; i++)
			map.frontier[tk[i]] = true;
		map.side = 1;		
		map.newPos = -1;	
		map.newRev = [];	
		map.nextIndex = [];	
		map.next = {};		
		map.nextNum = 0;	
		map.prevNum = 0;	
		map.key = [0,0];	
		history = [];
		update();
	}

	function update()	//
	{
		var aiAuto = oo.aiSide==map.side || oo.aiSide==2;
		oo.findLocation(map);
		board.update(map,aiAuto);
		// console.log(map.nextIndex)

		if (map.space==0 || map.nextNum==0 && map.prevNum==0)		
		{
			setTimeout(gameOver, 300);
			return;
		}
		if (map.nextNum==0)	
		{
			oo.pass(map);
			setTimeout(update, 300);
			return;
		}
		if (aiAuto)
		{
			aiRuning = true;
			setTimeout(aiRun, 300);
		}
	}

	function aiRun()	
	{
		if (map.nextNum==1)	
			oo.go(map.nextIndex[0]);
		else if (map.space<=58)
			oo.go(ai.startSearch(map));
		else
			oo.go(map.nextIndex[Math.random()*map.nextIndex.length>>0]);
	}
	// document.getElementById("ai").onclick = aiRun;

	function gameOver()
	{
		

		alert("End!\n\nBlack: "+map.black+" \nWhite: "+map.white+" \n\n"+(map.black==map.white?"Draw!":map.black>map.white?"Black win!":"White win!"));
	}

	oo.dire = (function(){				
		var dr = [-8,-7,1,9,8,7,-1,-9];
		var bk = [8,0,0,0,8,7,7,7];
		return function(i,d)
		{
			i += dr[d];
			return (i&64)!=0 || (i&7)==bk[d] ? 64 : i;
		}
	})();

	oo.findLocation = function (m)		
	{
		function is(i,j)
		{
			var lk = 0;
			while ((i=oo.dire(i,j))!=64 && m[i]==-m.side)
			{
				ta[la++] = i;
				lk++;
			}
			if(i==64 || m[i]!=m.side)
				la -= lk;
		}
		m.nextIndex = [];
		m.next = [];
		var hist = ai.history[m.side==1?0:1][m.space];
		for(var i=0; i<60; i++)
		{
			var fi = hist[i];
			if (!m.frontier[fi])
				continue;
			var ta = [], la = 0;
			for (var j=0; j<8; j++)
				is(fi,j);
			if (la>0)
			{
				if (la!=ta.length)
				 	ta = ta.slice(0, la);
				m.next[fi] = ta;
				m.nextIndex.push(fi);
			}
		}
		m.nextNum = m.nextIndex.length;
	}

	oo.pass = function(m)		
	{
		m.side = -m.side;
		m.prevNum = m.nextNum;
		zobrist.swap(m.key);
	}

	oo.newMap = function(m,n)			
	{
		var nm = m.slice(0);		
		nm[n] = m.side;				

		nm.key = m.key.slice(0);	
		zobrist.set(nm.key,m.side==1?0:1,n);

		nm.frontier = m.frontier.slice(0);	
		nm.frontier[n] = false;
		for (var i=0; i<8; i++)
		{
			var k = oo.dire(n,i);
			if (k!=64 && nm[k]==0)
				nm.frontier[k] = true;
		}

		var ne = m.next[n];
		var l = ne.length;
		for(var i=0; i<l; i++)
		{
			nm[ne[i]] = m.side;	
			zobrist.set(nm.key,2,ne[i]);
		}
		if (m.side==1)
		{
			nm.black = m.black + l + 1;
			nm.white = m.white - l;
		}
		else
		{
			nm.white = m.white + l + 1;
			nm.black = m.black - l;
		}
		nm.space = 64 - nm.black - nm.white;	
		nm.side = -m.side;
		nm.prevNum = m.nextNum;
		zobrist.swap(nm.key);
		return nm;
	}


	oo.goChess = function (n)
	{
		history.push(map);
		oo.go(n);
	}

	oo.go = function (n)
	{
		aiRuning = false;
		var rev = map.next[n];
		map = oo.newMap(map,n);
		map.newRev = rev;
		map.newPos = n;
		// console.log(map.key);
		update();
	}

	oo.historyBack = function ()
	{
		if (aiRuning || history.length==0)
			return;
		map = history.pop();
		update();
	}

}


var board = new Chessboard();
var ai = new AI();
var othe = new Othello();

board.create();
board.toDown = othe.goChess;

document.getElementById("play").onclick = function() {
	document.getElementById("selectbox").style.display = "block";
};
document.getElementById("back").onclick = function() {
	othe.historyBack();
};
document.getElementById("ok").onclick = function() {
	document.getElementById("selectbox").style.display = "none";
	var ro = document.getElementById("selectbox").getElementsByTagName("input");
	othe.aiSide = ro[0].checked?-1:1;
	for (var i = 2; i < ro.length; i++)
		if (ro[i].checked)
			break;
	ai.calculateTime = [20,100,500,2000,5000,10000,20000][i-2];
	ai.outcomeDepth = [7,10,13,14,15,16,17][i-2];
	othe.play();
};
document.getElementById("cancel").onclick = function() {
	document.getElementById("selectbox").style.display = "none";
};

document.getElementById("explain").onclick = function() {
	alert("          Othello is also called Reversi. It is a two player game with an 8x8 chessboard. There are sixty-four identical game pieces, also called discs, which are white on one side and black on the other. Players take turns placing disks on the board with their assigned color facing up. During a play, any disks of the opponent's color that are in a straight line and bounded by the disk just placed and another disk of the current player's color are turned over to the current player's color. ");
};

document.getElementById("2d3d").onclick = function() {
	var desk = document.getElementById("desk");
	desk.className = desk.className=="fdd"?"":"fdd";
	this.innerHTML = desk.className=="fdd"?"2D":"3D";
};
