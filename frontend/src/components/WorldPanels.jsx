import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, Search, Plus, ShieldCheck, Globe2, Users, LockKeyhole, Copy, ExternalLink, Check, Loader2, Flag, Sprout, Building2 } from 'lucide-react';
import { Panel } from './Panel';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { toast } from './ui/sonner';
import { api, errorMessage } from '../lib/api';

export const TokenLogo = ({ world }) => <span className={`token-logo region-${world.region % 4}`}><span>{world.symbol?.slice(0,1)}</span>{world.logo && <img src={world.logo} alt={`${world.symbol} logo`} onError={e => { e.currentTarget.style.display = 'none'; }}/>}</span>;

export const WorldPanels = ({ panel, setPanel, worlds, selected, setSelected, enterWorld, busy, player, refreshWorlds, connectWallet, setActiveWorld, viewTerritory, plot }) => {
  const [search, setSearch] = useState(''), [sort, setSort] = useState('trending');
  const [contract, setContract] = useState(''), [token, setToken] = useState(null);
  const [holding, setHolding] = useState('0'), [actions, setActions] = useState(['enter','contribute']);
  const [working, setWorking] = useState(false), [error, setError] = useState('');
  const [accessEdit, setAccessEdit] = useState(false);
  useEffect(() => { if (panel === 'create') { setToken(null); setError(''); setContract(''); setHolding('0'); setActions(['enter','contribute']); } }, [panel]);
  useEffect(() => { if (selected) { setHolding(selected.min_holding); setActions(selected.gated_actions); setAccessEdit(false); setError(''); } }, [selected]);
  const close = () => setPanel(null);
  const sorted = worlds.filter(w => `${w.name} ${w.symbol} ${w.contract}`.toLowerCase().includes(search.toLowerCase().replace(/^\$/, ''))).sort((a,b) => sort === 'new' ? b.created_at.localeCompare(a.created_at) : sort === 'updated' ? b.updated_at.localeCompare(a.updated_at) : sort === 'active' ? b.points-a.points : b.citizens-a.citizens);
  const lookup = async e => {
    e.preventDefault(); setWorking(true); setError(''); setToken(null);
    try { setToken((await api.get(`/tokens/${contract.trim()}`)).data); }
    catch(e) { setError(errorMessage(e)); } finally { setWorking(false); }
  };
  const create = async () => {
    setWorking(true); setError('');
    try {
      const { data } = await api.post('/worlds', { contract: token.contract, min_holding: holding || '0', gated_actions: actions,
        ...(plot?.available ? {plot_x:plot.x,plot_y:plot.y} : {}) });
      await refreshWorlds(); setSelected(data); setPanel('world'); toast.success(`${data.name} is part of Kingcom!`);
    } catch(e) { setError(errorMessage(e)); } finally { setWorking(false); }
  };
  const contribute = async () => {
    setWorking(true); setError('');
    try { const { data } = await api.post(`/worlds/${selected.id}/contribute`); setSelected(data); setActiveWorld(data); await refreshWorlds(); toast.success('+10 community progress. Together, we grow.'); }
    catch(e) { setError(errorMessage(e)); } finally { setWorking(false); }
  };
  const saveAccess = async () => {
    setWorking(true); setError('');
    try { const { data } = await api.patch(`/worlds/${selected.id}/access`, {min_holding: holding || '0', gated_actions: actions}); setSelected(data); await refreshWorlds(); setAccessEdit(false); toast.success('Community access updated.'); }
    catch(e) { setError(errorMessage(e)); } finally { setWorking(false); }
  };
  const gateFields = <div className="gate-fields"><label htmlFor="minimum-holding">Minimum token holding <span>Optional</span></label><div className="holding-input"><Input id="minimum-holding" data-testid="minimum-holding-input" type="number" min="0" step="any" value={holding} onChange={e => setHolding(e.target.value)}/><span>${token?.symbol || selected?.symbol}</span></div><p>0 means everyone is welcome.</p>{Number(holding) > 0 && <div className="gate-actions">{[['enter','Enter the community'],['contribute','Contribute to progress']].map(([id,label]) => <label key={id}>{label}<Switch data-testid={`gate-${id}-switch`} checked={actions.includes(id)} onCheckedChange={value => setActions(a => value ? [...a,id] : a.filter(x => x!==id))}/></label>)}</div>}</div>;
  return <>
    <Panel open={panel === 'explore'} onClose={close} wide title="Find your corner of the internet." subtitle={`${worlds.length} community territories. One continuous continent.`} id="explore">
      <div className="search-field"><Search size={18}/><Input data-testid="world-search-input" placeholder="Search a world, ticker, or contract…" value={search} onChange={e => setSearch(e.target.value)}/></div>
      <div className="discovery-tabs">{[['trending','Trending'],['new','New territories'],['active','Most active'],['updated','Recently updated']].map(([id,label]) => <button key={id} data-testid={`sort-${id}`} onClick={() => setSort(id)} className={sort===id?'active':''}>{label}</button>)}</div>
      <div className="world-list" data-testid="world-list">{sorted.map(world => <button className="world-row" key={world.id} data-testid={`world-card-${world.symbol.toLowerCase()}`} onClick={() => {setSelected(world);setPanel('world');}}><TokenLogo world={world}/><span className="world-row-title"><strong>{world.name}</strong><small>${world.symbol} <span>·</span> Solana</small></span><span className="world-row-meta"><strong><Users size={13}/>{world.citizens}</strong><small>Level {world.level}</small></span>{Number(world.min_holding)>0?<LockKeyhole size={16}/>:<ArrowUpRight size={18}/>}</button>)}{!sorted.length && <div className="empty-state" data-testid="world-search-empty"><CompassPlaceholder/><h3>No worlds found</h3><p>Your community could be the next one.</p><Button data-testid="empty-create-world" onClick={() => setPanel('create')}>Create a world<Plus size={16}/></Button></div>}</div>
      <div className="discovery-footer"><span>A home for every community.</span><button data-testid="explore-create-world" onClick={() => setPanel('create')}>Create yours <ArrowUpRight size={15}/></button></div>
    </Panel>
    <Panel open={panel === 'create'} onClose={close} title="Claim a place in the bigger picture." subtitle="Your token. Your community. Your territory in Kingcom." id="create">
      {plot?.available && <div className="selected-plot-note" data-testid="selected-territory-location"><Globe2 size={17}/>{plot.biome} · {plot.x.toLocaleString()}, {plot.y.toLocaleString()}</div>}
      <form onSubmit={lookup} className="token-form"><label htmlFor="contract-address">Solana contract address</label><div className="contract-field"><Input id="contract-address" data-testid="contract-address-input" placeholder="Paste contract address" value={contract} onChange={e => {setContract(e.target.value);setToken(null);setError('');}} required minLength={32} maxLength={44}/><Button type="submit" data-testid="lookup-token-button" disabled={working || contract.trim().length<32}>{working ? <Loader2 className="spin" size={17}/> : <ArrowRight size={18}/>}</Button></div></form>
      {error && <p className="inline-error" data-testid="create-world-error" role="alert">{error}</p>}
      {token && <div className="recognized-token" data-testid="recognized-token"><div className="token-identity"><TokenLogo world={token}/><div><h3>{token.name}</h3><span>${token.symbol} · Solana</span></div><ShieldCheck size={21}/></div>{token.description && <p>{token.description}</p>}
        {token.existing_world ? <><div className="existing-notice" data-testid="world-exists-notice"><Check size={16}/> Territory already exists</div><Button className="full-button" data-testid="visit-existing-world" onClick={() => {setSelected(worlds.find(w=>w.id===token.existing_world));setPanel('world');}}>Explore {token.symbol} Territory<ArrowUpRight size={17}/></Button></> : <>{gateFields}<Button className="full-button" data-testid="confirm-create-world" onClick={create} disabled={working}>{working?<Loader2 className="spin" size={17}/>:<Plus size={17}/>}Create {token.symbol} Territory</Button></>}
      </div>}
      {!token && <div className="create-note"><Sprout size={29}/><p>A community's next chapter starts here.</p><span>One token contract. One territory on the shared continent.</span></div>}
    </Panel>
    <Panel open={panel === 'world' && !!selected} onClose={close} title={selected?.name || 'Community territory'} subtitle={selected ? `Continent coordinates ${selected.center_x?.toLocaleString()}, ${selected.center_y?.toLocaleString()}` : 'A physical place on the shared continent.'} id="world-details">
      {selected && <><div className={`world-banner region-banner-${selected.region % 4}`}><TokenLogo world={selected}/><span>${selected.symbol}</span><span className="world-access-tag">{Number(selected.min_holding)>0?<LockKeyhole size={12}/>:<Globe2 size={12}/>} {Number(selected.min_holding)>0?'Holder community':'Open community'}</span></div>
        <div className="community-stats"><span><small>Citizens</small><strong data-testid="world-citizens">{selected.citizens}</strong></span><span><small>Development stage</small><strong data-testid="world-level">{selected.level}<small> / 10</small></strong></span><span><small>Community progress</small><strong data-testid="world-progress">{selected.progress}%</strong></span></div>
        <div className="progress-track"><span style={{width:`${selected.progress}%`}}/></div>
        <div className="milestone" data-testid="next-milestone"><Flag size={17}/><span>{selected.level >= 10 ? 'A thriving community district' : `Next milestone · ${selected.level===1?'Community houses':selected.level===2?'Marketplace':selected.level<5?'Community hall':'Territory expansion'}`}</span><small>Stage {Math.min(10,selected.level+1)}</small></div>
        {Number(selected.min_holding)>0 && <div className="holding-notice" data-testid="holding-requirement"><LockKeyhole size={17}/><span>Community requirement<strong>{Number(selected.min_holding).toLocaleString()} ${selected.symbol}</strong></span>{!player.wallet && <button data-testid="gate-connect-wallet" onClick={connectWallet}>Connect wallet<ArrowUpRight size={14}/></button>}</div>}
        {error && <p className="inline-error" data-testid="world-action-error" role="alert">{error}</p>}
        {accessEdit && gateFields}
        <div className="world-detail-actions">{accessEdit ? <Button data-testid="save-world-access" onClick={saveAccess} disabled={working}>Save access settings<Check size={17}/></Button> : player.world_id===selected.id ? <Button data-testid="contribute-button" onClick={contribute} disabled={working}>{working?<Loader2 className="spin" size={16}/>:<Sprout size={17}/>}Support this community</Button> : <Button data-testid="enter-world-button" onClick={() => enterWorld(selected)} disabled={busy}>{busy?<Loader2 className="spin" size={16}/>:null}Enter community<ArrowRight size={17}/></Button>}</div>
        <button className="territory-map-button" data-testid="view-territory-on-map" onClick={()=>viewTerritory(selected)}><Globe2 size={15}/>View territory on the map<ArrowUpRight size={15}/></button>
        <div className="world-links"><button data-testid="copy-world-contract" onClick={async () => {try {await navigator.clipboard.writeText(selected.contract);toast.success('Contract address copied.');}catch {toast.error('Clipboard unavailable.');}}}><Copy size={13}/>{selected.contract.slice(0,5)}…{selected.contract.slice(-5)}</button>{selected.website && <a data-testid="world-website-link" href={selected.website} target="_blank" rel="noreferrer">Website<ExternalLink size={12}/></a>}{selected.twitter && <a data-testid="world-social-link" href={selected.twitter} target="_blank" rel="noreferrer">X<ExternalLink size={12}/></a>}</div>
        {selected.owner_id === player.id && <button className="edit-access" data-testid="edit-world-access" onClick={() => setAccessEdit(!accessEdit)}>Manage community access</button>}
      </>}
    </Panel>
  </>;
};
const CompassPlaceholder = () => <Globe2 size={36} strokeWidth={1.3}/>;