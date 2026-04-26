// Alger Music Cloudflare Worker - NeteaseCloudMusicApi → Meting API Adapter
// Translates NeteaseCloudMusicApi format requests to Meting-API-Serverless calls

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders()
      });
    }

    // Health check
    if (path === '/' || path === '/health') {
      return jsonResponse({ status: 'ok', service: 'alger-music-adapter' });
    }

    // Route: /api/* → translate to Meting API
    if (path.startsWith('/api')) {
      const apiPath = path.replace(/^\/api/, '');
      const params = Object.fromEntries(url.searchParams.entries());
      const body: Record<string, any> = request.method === 'POST'
        ? await request.json().catch(() => ({}))
        : {};

      try {
        const result = await routeApi(apiPath, params, body, env);
        return jsonResponse(result);
      } catch (err: any) {
        console.error(`API error for ${path}:`, err);
        return jsonResponse({ code: 500, message: err.message || 'Internal error' }, 500);
      }
    }

    return jsonResponse({ code: 404, message: 'Not found' }, 404);
  }
};

// ========== Meting API Client ==========

async function metingRequest(env: Env, type: string, id: string): Promise<any> {
  const metingUrl = env.METING_API_URL || 'https://meting-api.your-domain.workers.dev';
  const token = env.METING_TOKEN || 'token';
  
  // Calculate HMAC auth
  const auth = await hmacSha1(token, `netease${type}${id}`);
  
  const url = `${metingUrl}/api?server=netease&type=${type}&id=${encodeURIComponent(id)}&auth=${auth}`;
  const res = await fetch(url, {
    headers: { 'Referer': env.METING_COOKIE_ALLOW_HOSTS || '' }
  });
  
  if (!res.ok) {
    throw new Error(`Meting API error: ${res.status}`);
  }
  
  return res.json();
}

async function hmacSha1(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(data);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ========== Direct Netease API Calls ==========
// For features Meting doesn't cover, call music.163.com directly

async function neteaseRequest(
  path: string,
  params: Record<string, string>,
  method: string = 'GET'
): Promise<any> {
  const baseUrl = 'https://music.163.com';
  const queryString = new URLSearchParams(params).toString();
  const url = method === 'GET' 
    ? `${baseUrl}${path}?${queryString}`
    : `${baseUrl}${path}`;

  const options: RequestInit = {
    method,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://music.163.com',
      'Cookie': params.cookie || ''
    }
  };

  if (method === 'POST') {
    options.body = new URLSearchParams(params).toString();
    (options.headers as Record<string, string>)['Content-Type'] = 'application/x-www-form-urlencoded';
  }

  const res = await fetch(url, options);
  return res.json();
}

// ========== Route Mapper ==========

async function routeApi(
  path: string,
  params: Record<string, any>,
  body: Record<string, any>,
  env: Env
): Promise<any> {
  // ----- Search -----
  if (path === '/cloudsearch') {
    return handleSearch(params, env);
  }
  if (path === '/search/suggest') {
    return handleSearchSuggest(params, env);
  }
  if (path === '/search/default') {
    return { code: 200, data: { realkeyword: '热门音乐' } };
  }
  if (path === '/search/hot/detail') {
    return handleHotSearch(env);
  }

  // ----- Song -----
  if (path === '/song/url/v1' || path === '/song/url') {
    return handleSongUrl(params, env);
  }
  if (path === '/song/music/detail') {
    return handleSongMusicDetail(params, env);
  }
  if (path === '/song/detail') {
    return handleSongDetail(params, env);
  }
  if (path === '/song/download/url/v1') {
    return handleSongUrl(params, env);
  }

  // ----- Lyric -----
  if (path === '/lyric/new' || path === '/lyric') {
    return handleLyric(params, env);
  }

  // ----- Playlist -----
  if (path === '/playlist/detail') {
    return handlePlaylistDetail(params, env);
  }
  if (path === '/playlist/catlist') {
    return handlePlaylistCatlist(env);
  }
  if (path === '/personalized') {
    return handlePersonalized(params, env);
  }
  if (path === '/playlist/create') {
    return { code: 200, playlist: null };
  }
  if (path === '/playlist/tracks') {
    return { code: 200 };
  }
  if (path === '/playlist/subscribe') {
    return { code: 200 };
  }

  // ----- Album -----
  if (path === '/album') {
    return handleAlbumDetail(params, env);
  }
  if (path === '/album/newest') {
    return handleAlbumNewest(env);
  }
  if (path === '/album/sub') {
    return { code: 200 };
  }
  if (path === '/top/album') {
    return handleTopAlbum(params, env);
  }

  // ----- Artist -----
  if (path === '/top/artists') {
    return handleTopArtists(params, env);
  }
  if (path === '/artist/detail' || path === '/artists') {
    return handleArtistDetail(params, env);
  }

  // ----- Banner -----
  if (path === '/banner') {
    return handleBanner(params, env);
  }

  // ----- Personal FM -----
  if (path === '/personal_fm') {
    return handlePersonalFM(env);
  }

  // ----- Recommend -----
  if (path === '/personalized/newsong') {
    return handlePersonalizedNewsong(params, env);
  }
  if (path === '/recommend/songs') {
    return handleRecommendSongs(env);
  }
  if (path === '/recommend/songs/dislike') {
    return { code: 200 };
  }
  if (path === '/personalized/mv') {
    return handlePersonalizedMV(env);
  }
  if (path === '/personalized/privatecontent') {
    return { result: [] };
  }
  if (path === '/personalized/djprogram') {
    return { result: [] };
  }

  // ----- MV -----
  if (path === '/mv/url') {
    return handleMvUrl(params, env);
  }
  if (path === '/mv/detail') {
    return handleMvDetail(params, env);
  }

  // ----- User / Login -----
  if (path === '/login/qr/key') {
    return { code: 200, data: { unikey: 'web-mode', code: 200 } };
  }
  if (path === '/login/qr/create') {
    return { code: 200, data: { qrimg: '', code: 200 } };
  }
  if (path === '/login/qr/check') {
    return { code: 800, message: 'Web mode does not support QR login' };
  }
  if (path === '/login/status') {
    return { code: 200, data: { account: null, profile: null } };
  }
  if (path === '/user/account') {
    return { code: 200, account: null };
  }
  if (path === '/logout') {
    return { code: 200 };
  }
  if (path === '/likelist') {
    return { code: 200, ids: [] };
  }
  if (path === '/like') {
    return { code: 200 };
  }

  // ----- History / Intelligence -----
  if (path === '/history/recommend/songs') {
    return { code: 200, data: [] };
  }
  if (path === '/playmode/intelligence/list') {
    return { code: 200, data: [] };
  }
  if (path === '/fm_trash') {
    return { code: 200 };
  }

  // ----- Fallback: try direct Netease API -----
  console.log(`Unhandled path: ${path}, attempting direct API call`);
  try {
    return await neteaseRequest(path, params);
  } catch (e) {
    return { code: 404, message: `Endpoint ${path} not supported` };
  }
}

// ========== Handler Implementations ==========

async function handleSearch(params: Record<string, any>, env: Env): Promise<any> {
  const keyword = params.keywords || '';
  const limit = params.limit || 30;
  const offset = params.offset || 0;
  const type = params.type || 1; // 1=songs, 10=albums, 100=artists, 1000=playlists, 1004=mv, 1006=lyric, 1009=complex

  try {
    const metingType = type == 1 ? 'search' : type == 1000 ? 'playlist' : 'search';
    const data = await metingRequest(env, metingType, keyword);
    
    if (!Array.isArray(data)) return { code: 200, result: { songs: [] } };
    
    // Translate Meting response to NeteaseCloudMusicApi format
    if (type == 1) {
      // Song search
      const songs = data.map((item: any) => mapMetingSongToNetease(item));
      return {
        code: 200,
        result: {
          songs,
          songCount: data.length
        }
      };
    } else if (type == 1000) {
      // Playlist search
      const playlists = data.map((item: any) => ({
        id: item.id,
        name: item.name || item.title,
        coverImgUrl: item.pic || item.cover,
        creator: { nickname: '' },
        trackCount: 0,
        playCount: 0
      }));
      return { code: 200, result: { playlists, playlistCount: data.length } };
    } else if (type == 10) {
      // Album search
      const albums = data.map((item: any) => ({
        id: item.id,
        name: item.name || item.title,
        picUrl: item.pic,
        artist: { name: item.artist || item.author }
      }));
      return { code: 200, result: { albums, albumCount: data.length } };
    } else if (type == 100) {
      // Artist search
      const artists = data.map((item: any) => ({
        id: item.id,
        name: item.name || item.title,
        picUrl: item.pic,
        alias: []
      }));
      return { code: 200, result: { artists, artistCount: data.length } };
    }
    
    return { code: 200, result: { songs: data } };
  } catch (e: any) {
    return { code: 500, message: e.message };
  }
}

async function handleSearchSuggest(params: Record<string, any>, env: Env): Promise<any> {
  const keyword = params.keywords || '';
  try {
    const data = await metingRequest(env, 'search', keyword);
    if (!Array.isArray(data)) return { code: 200, result: {} };
    
    const songs = data.slice(0, 5).map((item: any) => ({ name: item.name || item.title }));
    const artists = [...new Set(data.slice(0, 10).map((item: any) => item.artist || item.author))]
      .filter(Boolean).slice(0, 5).map(name => ({ name }));
    
    return { code: 200, result: { songs, artists, albums: [] } };
  } catch (e: any) {
    return { code: 200, result: {} };
  }
}

async function handleHotSearch(env: Env): Promise<any> {
  // Return static hot search keywords since Meting doesn't have this
  return {
    code: 200,
    data: [
      { searchWord: '热门歌曲', score: 1000, content: '' },
      { searchWord: '流行音乐', score: 900, content: '' },
      { searchWord: '经典老歌', score: 800, content: '' }
    ]
  };
}

async function handleSongUrl(params: Record<string, any>, env: Env): Promise<any> {
  const id = params.id;
  if (!id) return { code: 400, message: 'id required' };

  try {
    const data = await metingRequest(env, 'url', String(id));
    
    // Meting returns either a string URL or an object
    const url = typeof data === 'string' ? data : data?.url || '';
    
    return {
      code: 200,
      data: [{
        id: Number(id),
        url: url,
        code: url ? 200 : 404,
        type: 'mp3',
        level: params.level || 'standard',
        encodeType: params.encodeType || 'mp3'
      }]
    };
  } catch (e: any) {
    return { code: 200, data: [{ id: Number(id), url: '', code: 404 }] };
  }
}

async function handleSongMusicDetail(params: Record<string, any>, env: Env): Promise<any> {
  const id = params.id;
  if (!id) return { code: 400, message: 'id required' };

  try {
    const data = await metingRequest(env, 'song', String(id));
    const song = Array.isArray(data) ? data[0] : data;
    
    return {
      code: 200,
      data: {
        id: Number(id),
        url: song?.url || '',
        type: 'mp3',
        level: 'standard'
      }
    };
  } catch (e: any) {
    return { code: 200, data: { id: Number(id), url: '' } };
  }
}

async function handleSongDetail(params: Record<string, any>, env: Env): Promise<any> {
  const ids = params.ids;
  if (!ids) return { code: 400, message: 'ids required' };

  try {
    const idList = ids.split(',');
    const songs = [];
    
    for (const id of idList) {
      try {
        const data = await metingRequest(env, 'song', id);
        const song = Array.isArray(data) ? data[0] : data;
        if (song) songs.push(mapMetingSongToNetease(song));
      } catch (e) {
        // Skip failed song lookups
      }
    }

    return { code: 200, songs };
  } catch (e: any) {
    return { code: 200, songs: [] };
  }
}

async function handleLyric(params: Record<string, any>, env: Env): Promise<any> {
  const id = params.id;
  if (!id) return { code: 400, message: 'id required' };

  try {
    const data = await metingRequest(env, 'lrc', String(id));
    
    // Meting returns lyric string or object
    let lrc = '';
    let tlyric = '';
    
    if (typeof data === 'string') {
      lrc = data;
    } else if (data && typeof data === 'object') {
      lrc = data.lrc || data.lyric || '';
      tlyric = data.tlyric || data.translate || '';
    }

    return {
      code: 200,
      lrc: { version: 1, lyric: lrc },
      tlyric: { version: 1, lyric: tlyric }
    };
  } catch (e: any) {
    return { code: 200, lrc: { version: 1, lyric: '' }, tlyric: { version: 1, lyric: '' } };
  }
}

async function handlePlaylistDetail(params: Record<string, any>, env: Env): Promise<any> {
  const id = params.id;
  if (!id) return { code: 400, message: 'id required' };

  try {
    const data = await metingRequest(env, 'playlist', String(id));
    
    if (Array.isArray(data)) {
      // Meting playlist returns array of songs
      const tracks = data.map((item: any) => mapMetingSongToNetease(item));
      return {
        code: 200,
        playlist: {
          id: Number(id),
          name: '',
          tracks,
          trackIds: tracks.map((t: any) => ({ id: t.id })),
          trackCount: tracks.length,
          coverImgUrl: tracks[0]?.al?.picUrl || ''
        }
      };
    }
    
    return { code: 200, playlist: data };
  } catch (e: any) {
    return { code: 200, playlist: { id: Number(id), tracks: [], trackCount: 0 } };
  }
}

async function handlePlaylistCatlist(env: Env): Promise<any> {
  return {
    code: 200,
    categories: { '0': '语种', '1': '风格', '2': '场景', '3': '情感', '4': '主题' },
    sub: [
      { name: '华语', category: 0 }, { name: '欧美', category: 0 },
      { name: '日语', category: 0 }, { name: '韩语', category: 0 },
      { name: '流行', category: 1 }, { name: '摇滚', category: 1 },
      { name: '民谣', category: 1 }, { name: '电子', category: 1 }
    ]
  };
}

async function handlePersonalized(params: Record<string, any>, env: Env): Promise<any> {
  // Meting doesn't have personalized playlists
  // Return some popular playlists as placeholders
  return {
    code: 200,
    result: []
  };
}

async function handleAlbumDetail(params: Record<string, any>, env: Env): Promise<any> {
  const id = params.id;
  if (!id) return { code: 400, message: 'id required' };

  try {
    const data = await metingRequest(env, 'album', String(id));
    
    if (Array.isArray(data)) {
      const songs = data.map((item: any) => mapMetingSongToNetease(item));
      return {
        code: 200,
        songs,
        album: {
          id: Number(id),
          name: data[0]?.album || '',
          picUrl: data[0]?.pic || '',
          artist: { name: data[0]?.artist || '' },
          size: songs.length
        }
      };
    }
    
    return { code: 200, songs: [], album: data };
  } catch (e: any) {
    return { code: 200, songs: [], album: { id: Number(id) } };
  }
}

async function handleAlbumNewest(env: Env): Promise<any> {
  return { code: 200, albums: [] };
}

async function handleTopAlbum(params: Record<string, any>, env: Env): Promise<any> {
  return { code: 200, albums: [], total: 0 };
}

async function handleTopArtists(params: Record<string, any>, env: Env): Promise<any> {
  return { code: 200, artists: [], more: false };
}

async function handleArtistDetail(params: Record<string, any>, env: Env): Promise<any> {
  const id = params.id;
  if (!id) return { code: 400, message: 'id required' };

  try {
    const data = await metingRequest(env, 'artist', String(id));
    
    if (Array.isArray(data)) {
      const songs = data.map((item: any) => mapMetingSongToNetease(item));
      return {
        code: 200,
        artist: { id: Number(id), name: data[0]?.artist || '', picUrl: data[0]?.pic || '' },
        hotSongs: songs
      };
    }
    
    return { code: 200, artist: data, hotSongs: [] };
  } catch (e: any) {
    return { code: 200, artist: { id: Number(id) }, hotSongs: [] };
  }
}

async function handleBanner(params: Record<string, any>, env: Env): Promise<any> {
  return { code: 200, banners: [] };
}

async function handlePersonalFM(env: Env): Promise<any> {
  return { code: 200, data: [] };
}

async function handlePersonalizedNewsong(params: Record<string, any>, env: Env): Promise<any> {
  return { code: 200, result: [] };
}

async function handleRecommendSongs(env: Env): Promise<any> {
  return { code: 200, data: { dailySongs: [] } };
}

async function handlePersonalizedMV(env: Env): Promise<any> {
  return { code: 200, result: [] };
}

async function handleMvUrl(params: Record<string, any>, env: Env): Promise<any> {
  return { code: 200, data: { url: '' } };
}

async function handleMvDetail(params: Record<string, any>, env: Env): Promise<any> {
  return { code: 200, data: {} };
}

// ========== Data Mappers ==========

function mapMetingSongToNetease(item: any): any {
  return {
    id: Number(item.id) || 0,
    name: item.name || item.title || '',
    ar: (item.artist || item.author || '').split(/[,/、]/).map((name: string) => ({ name: name.trim(), id: 0 })),
    al: {
      id: 0,
      name: item.album || '',
      picUrl: item.pic || item.cover || ''
    },
    dt: (item.duration || 0) * 1000,
    h: item.url ? { br: 320000, fid: 0, size: 0, vd: 0, sr: 44100 } : null,
    m: item.url ? { br: 192000, fid: 0, size: 0, vd: 0, sr: 44100 } : null,
    l: item.url ? { br: 128000, fid: 0, size: 0, vd: 0, sr: 44100 } : null,
    sq: null,
    hr: null,
    privilege: { fee: 0, payed: 0, st: 0, pl: 320000, dl: 320000, maxbr: 320000, fl: 320000 },
    fee: 0,
    publishTime: 0
  };
}

// ========== Utilities ==========

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };
}

function jsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders()
    }
  });
}

// ========== Type Definitions ==========

interface Env {
  METING_API_URL: string;
  METING_TOKEN: string;
  METING_COOKIE_ALLOW_HOSTS?: string;
}
