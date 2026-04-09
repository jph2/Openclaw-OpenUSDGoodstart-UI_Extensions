import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Upload, RefreshCw, Save, Check } from 'lucide-react';

const TELEGRAM_GROUPS = [
    { id: "-5207805052", name: "TG000_General_Chat", status: "active", currentTask: "General conversation" },
    { id: "-5272630186", name: "TG001_Idea_Capture", status: "idle", currentTask: "Waiting for input" },
    { id: "-5272630187", name: "TG010_General_Discovery_Research", status: "idle", currentTask: "Research standby" },
    { id: "-3510007915", name: "TG020_omniUSD", status: "active", currentTask: "USD scene development" },
    { id: "-5272630188", name: "TG030_dcc_cad", status: "idle", currentTask: "DCC tools ready" },
    { id: "-5272630189", name: "TG040_webdev_backend", status: "active", currentTask: "API development" },
    { id: "-5272630190", name: "TG050_webdev_frontend", status: "active", currentTask: "UI improvements" },
    { id: "-5272630191", name: "TG060_social_media", status: "idle", currentTask: "Monitoring mentions" },
    { id: "-5272630192", name: "TG070_qa_security", status: "idle", currentTask: "Security checks" },
    { id: "-5272630193", name: "TG500_openclaw_governance", status: "active", currentTask: "System orchestration" },
    { id: "-5272630194", name: "TG510_upcoming_skills", status: "planning", currentTask: "Skill planning" },
    { id: "-5272630195", name: "TG520_agentic_intelligence", status: "research", currentTask: "Agent architecture" },
    { id: "-5272630196", name: "TG700_studio_framework", status: "active", currentTask: "Framework development" },
    { id: "-5012559503", name: "TG800_experimental_box", status: "active", currentTask: "Channel Manager UI" },
    { id: "-5272630197", name: "TG900_troubleshooting", status: "standby", currentTask: "Debug ready" }
];

const AVAILABLE_MODELS = [
    { id: "local-pc/google/gemma-4-26b-a4b", name: "Gemma 4 26B", desc: "Fast local inference, primary model" },
    { id: "moonshot/kimi-k2.5", name: "Kimi K2.5", desc: "Strong reasoning, good for complex tasks" },
    { id: "kimi/kimi-code", name: "Kimi Code", desc: "Optimized for coding tasks" },
    { id: "openai-codex/gpt-5.4", name: "Codex", desc: "Latest OpenAI model, high capability" }
];

const MAIN_AGENTS = {
    tars: { name: "TARS", role: "Planner", color: "#50e3c2", defaultSkills: ["clawflow", "skill-creator", "clawhub"], quote: "Direct, honest, useful. No fake certainty. Builds with architecture and rigor." },
    marvin: { name: "MARVIN", role: "Critic", color: "#e35050", defaultSkills: ["healthcheck", "node-connect"], quote: "Zero-trust reviewer. Assumes everything is broken. Finds failures before they find you." },
    sonic: { name: "SONIC", role: "Executor", color: "#e3c450", defaultSkills: ["web_search", "web_fetch"], quote: "Fast execution inside scope. Moves quick when plan is solid. Stops when reality diverges." }
};

const SUB_AGENTS = {
    researcher: { name: "Researcher", parent: "tars", additionalSkills: ["web_search", "web_fetch"] },
    coder: { name: "Coder", parent: "sonic", additionalSkills: ["omniverse-extension-development", "usd-development"] },
    reviewer: { name: "Reviewer", parent: "marvin", additionalSkills: [] },
    documenter: { name: "Documenter", parent: "tars", additionalSkills: ["notion"] },
    tester: { name: "Tester", parent: "marvin", additionalSkills: ["healthcheck"] }
};

const SKILL_METADATA = {
    "weather": { desc: "Get current weather and forecasts for any location", origin: "openclaw/skills", cat: "utility", src: "bundled", def: true },
    "web_search": { desc: "Search the web using Google Search grounding", origin: "openclaw/skills", cat: "research", src: "bundled", def: true },
    "web_fetch": { desc: "Fetch and extract content from URLs", origin: "openclaw/skills", cat: "research", src: "bundled", def: true },
    "healthcheck": { desc: "System security hardening and risk assessment", origin: "openclaw/skills", cat: "system", src: "bundled", def: false },
    "node-connect": { desc: "Diagnose OpenClaw node connection failures", origin: "openclaw/skills", cat: "system", src: "bundled", def: false },
    "notion": { desc: "Create and manage Notion pages and databases", origin: "clawhub", cat: "integration", src: "managed", def: false },
    "clawflow": { desc: "ClawFlow workflow orchestration and job management", origin: "openclaw/skills", cat: "orchestration", src: "bundled", def: true },
    "skill-creator": { desc: "Create, edit and audit AgentSkills", origin: "openclaw/skills", cat: "development", src: "bundled", def: false },
    "clawhub": { desc: "Search, install and publish agent skills", origin: "openclaw/skills", cat: "utility", src: "bundled", def: false }
};

export default function ChannelManager() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('channels');
    
    // Manage Channels Tab State
    const [rowSubtabs, setRowSubtabs] = useState({}); // { channelId: 'config' | 'chat' }

    // Fetch live backend channels
    const { data: configData, isLoading } = useQuery({
        queryKey: ['channels'],
        queryFn: async () => {
            const res = await fetch('/api/channels');
            if (!res.ok) throw new Error('Failed to load channels');
            return res.json();
        }
    });

    const mutation = useMutation({
        mutationFn: async (payload) => {
            const res = await fetch('/api/channels/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Update failed');
            return res.json();
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channels'] })
    });

    const backendChannels = configData?.data?.channels || [];

    const handleUpdateChannel = (channelId, field, value) => {
        let channel = backendChannels.find(c => c.id === channelId) || { id: channelId };
        mutation.mutate({ ...channel, [field]: value, channelId: channelId });
    };

    const handleAddSkill = (channelId, skill) => {
        let channel = backendChannels.find(c => c.id === channelId) || { id: channelId, skills: [] };
        if (!channel.skills) channel.skills = [];
        if (!channel.skills.includes(skill)) {
            mutation.mutate({ ...channel, channelId, skills: [...channel.skills, skill] });
        }
    };

    const handleRemoveSkill = (channelId, skill) => {
        let channel = backendChannels.find(c => c.id === channelId);
        if (channel && channel.skills) {
            mutation.mutate({ ...channel, channelId, skills: channel.skills.filter(s => s !== skill) });
        }
    };

    const renderManageChannels = () => (
        <>
            <div className="toolbar" style={{ marginTop: '20px' }}>
                <input type="text" placeholder="Search channels..." />
                <select><option>All models</option></select>
                <select><option>All skills</option></select>
                <button>Reset</button>
            </div>
            
            <div className="toolbar" style={{ paddingBottom: '20px', borderBottom: '1px solid var(--border-color)', marginBottom: '0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px', fontWeight: 600 }}>
                    <input type="checkbox" /> Select All
                </label>
                <select><option>Set model for selected...</option></select>
                <button>Apply</button>
                <select><option>Add skill to selected...</option></select>
                <button>Add</button>
                <button style={{ marginLeft: 'auto' }}>Apply to All</button>
            </div>

            <table className="channel-table" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: 'none' }}>
                <thead>
                    <tr>
                        <th style={{ width: '40px' }}><input type="checkbox" /></th>
                        <th style={{ width: '250px' }}>Telegram Group</th>
                        <th>Configuration & Chat Workspace</th>
                    </tr>
                </thead>
                <tbody>
                    {TELEGRAM_GROUPS.map(tg => {
                        const channelState = backendChannels.find(c => c.id === tg.id) || {};
                        const assignedAgentKey = channelState.assignedAgent || 'tars';
                        const agentDetails = MAIN_AGENTS[assignedAgentKey] || MAIN_AGENTS.tars;
                        
                        // Calculating Skill Hierarchies
                        const defaultSkills = agentDetails.defaultSkills || [];
                        const subAgentSkills = []; // Mock logic for simplicity
                        const channelSkills = channelState.skills || [];
                        const allSkills = [...new Set([...defaultSkills, ...subAgentSkills, ...channelSkills])];
                        
                        const subTab = rowSubtabs[tg.id] || 'config';

                        return (
                            <tr key={tg.id} style={{ borderBottom: '3px solid rgba(255, 255, 255, 0.1)' }}>
                                <td style={{ borderLeft: `2px solid ${agentDetails.color || 'transparent'}`, width: '40px' }}>
                                    <input type="checkbox" />
                                </td>
                                
                                <td style={{ width: '250px' }}>
                                    <div className="tg-group">
                                        <div className="tg-name">{tg.name}</div>
                                        <div className="tg-id">{tg.id}</div>
                                        <div className={`status-badge ${tg.status}`} style={{ width: 'fit-content', marginTop: '8px' }}>
                                            <div className="status-dot"></div> {tg.status}
                                        </div>
                                        <div className="current-task" style={{ marginBottom: '16px' }}>{tg.currentTask}</div>
                                        
                                        <select 
                                            value={channelState.assignedAgent || ''} 
                                            onChange={(e) => handleUpdateChannel(tg.id, 'assignedAgent', e.target.value)}
                                            style={{ width: '100%', marginBottom: '8px' }}
                                        >
                                            <option value="">No Agent</option>
                                            <option value="tars">TARS</option>
                                            <option value="marvin">MARVIN</option>
                                            <option value="sonic">SONIC</option>
                                        </select>
                                        
                                        {Object.entries(SUB_AGENTS).filter(([_, sub]) => sub.parent === assignedAgentKey).map(([subId, sub]) => (
                                            <label key={subId} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginBottom: '4px' }}>
                                                <input type="checkbox" defaultChecked /> {sub.name}
                                                <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)' }}>+{sub.additionalSkills.length} skills</span>
                                            </label>
                                        ))}
                                    </div>
                                </td>
                                
                                <td style={{ padding: 0 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderLeft: '1px solid var(--border-color)' }}>
                                        <div className="row-tabs">
                                            <button 
                                                className={`row-tab ${subTab === 'config' ? 'active' : ''}`}
                                                onClick={() => setRowSubtabs({...rowSubtabs, [tg.id]: 'config'})}
                                            >⚙️ Configuration</button>
                                            <button 
                                                className={`row-tab ${subTab === 'chat' ? 'active' : ''}`}
                                                onClick={() => setRowSubtabs({...rowSubtabs, [tg.id]: 'chat'})}
                                            >💬 Chat</button>
                                        </div>
                                        
                                        {subTab === 'config' && (
                                            <div style={{ display: 'flex', padding: '16px', gap: '20px' }}>
                                                
                                                {/* Vertical Skills List */}
                                                <div className="skills-cell" style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>SKILLS</div>
                                                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
                                                        {allSkills.length} SKILLS (DEFAULT: {defaultSkills.length}, SUB: {subAgentSkills.length}, ADDED: {channelSkills.length})
                                                    </div>
                                                    
                                                    <div className="skills-list">
                                                        {allSkills.map(skill => {
                                                            const isChannelSkill = channelSkills.includes(skill);
                                                            const badgeText = isChannelSkill ? "CHANNEL SKILL" : "INHERITED BY AGENT";
                                                            const badgeColor = isChannelSkill ? "#888" : agentDetails.color;
                                                            return (
                                                                <div key={skill} className="skill-item active">
                                                                    <input type="checkbox" defaultChecked={true} />
                                                                    <div className="skill-content">
                                                                        <span className="skill-name">{skill}</span>
                                                                        <span className="skill-separator">|</span>
                                                                        <span className="skill-desc">{SKILL_METADATA[skill]?.desc}</span>
                                                                        <span style={{ fontSize: '9px', color: badgeColor, marginLeft: '8px', textTransform: 'uppercase' }}>{badgeText}</span>
                                                                    </div>
                                                                    {isChannelSkill && (
                                                                        <button className="remove" onClick={() => handleRemoveSkill(tg.id, skill)}>×</button>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    
                                                    <select 
                                                        onChange={(e) => {
                                                            if (e.target.value) { handleAddSkill(tg.id, e.target.value); e.target.value = ""; }
                                                        }}
                                                        style={{ width: '100%', marginTop: '8px' }}
                                                    >
                                                        <option value="">Add channel skill...</option>
                                                        {Object.keys(SKILL_METADATA).map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </div>
                                                
                                                {/* Model Radio List */}
                                                <div className="model-cell" style={{ width: '250px' }}>
                                                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>MODEL</div>
                                                    <div className="model-list">
                                                        {AVAILABLE_MODELS.map(model => (
                                                            <label key={model.id} className={`model-item ${channelState.model === model.id ? 'active' : ''}`}>
                                                                <input 
                                                                    type="radio" 
                                                                    name={`model-${tg.id}`}
                                                                    checked={channelState.model === model.id}
                                                                    onChange={() => handleUpdateChannel(tg.id, 'model', model.id)}
                                                                />
                                                                <div className="model-content">
                                                                    <span className="model-name">{model.name}</span>
                                                                    <span className="model-separator">|</span>
                                                                    <span className="model-desc" style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{model.desc}</span>
                                                                </div>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>

                                            </div>
                                        )}
                                        {subTab === 'chat' && (
                                            <div style={{ padding: '16px', color: 'var(--text-secondary)' }}>Chat simulation active...</div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </>
    );

    const renderSkillsTab = () => (
        <div style={{ padding: '24px 0' }}>
            <h2 style={{ marginBottom: '24px' }}>Available Skills</h2>
            <div style={{ display: 'grid', gap: '16px' }}>
                {Object.entries(SKILL_METADATA).map(([id, skill]) => (
                    <div key={id} className="skill-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <h3 style={{ margin: 0 }}>{id}</h3>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <span className="status-badge active">{skill.src}</span>
                                {skill.def && <span className="status-badge planning">DEFAULT</span>}
                            </div>
                        </div>
                        <div style={{ display: 'flex' }}>
                            <div style={{ flex: 1 }}>
                                <p style={{ margin: '0 0 12px 0', color: 'var(--text-primary)' }}>{skill.desc}</p>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                    <span style={{ marginRight: '16px' }}>Origin: <span style={{color:'var(--text-primary)'}}>{skill.origin}</span></span>
                                    <span>Category: <span style={{color:'var(--text-primary)'}}>{skill.cat}</span></span>
                                </div>
                            </div>
                            <div style={{ flex: 1, borderLeft: '1px solid var(--border-color)', paddingLeft: '16px' }}>
                                <div className="tg-id" style={{ marginTop: '30px' }}>/home/claw-agentbox/.npm-global/lib/node_modules/openclaw/skills/{id}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderAgentsTab = () => (
        <div style={{ padding: '24px 0' }}>
            <h2 style={{ marginBottom: '24px' }}>Main Agents</h2>
            <div style={{ display: 'grid', gap: '16px' }}>
                {Object.entries(MAIN_AGENTS).map(([key, agent]) => (
                    <div key={key} className="agent-card main" style={{ borderColor: agent.color }}>
                        <h3 style={{ color: agent.color }}>{agent.name}</h3>
                        <div className="agent-role">{agent.role}</div>
                        <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: '6px', fontStyle: 'italic', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                            "{agent.quote}"
                        </div>
                        
                        <div style={{ fontSize: '11px', color: agent.color, marginBottom: '8px' }}>Default Skills: {agent.defaultSkills.length} skills</div>
                        {agent.defaultSkills.map(s => (
                            <div key={s} className="skill-item active" style={{ marginBottom: '4px', background: 'var(--bg-primary)' }}>
                                <input type="checkbox" checked={true} readOnly />
                                <span className="skill-name">{s}</span>
                                <span className="skill-separator">|</span>
                                <span className="skill-desc">{SKILL_METADATA[s]?.desc}</span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', padding: '0', display: 'flex', flexDirection: 'column' }}>
            
            {/* STICKY HEADER */}
            <header style={{ 
                padding: '20px 24px', 
                margin: 0, 
                position: 'sticky', top: 0, 
                background: 'var(--bg-primary)', 
                borderBottom: '1px solid var(--border-color)', 
                zIndex: 100,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '1.4rem' }}>
                        📺 Channel Manager
                    </h1>
                    <div className="tabs" style={{ marginTop: '4px' }}>
                        <button className={`tab ${activeTab === 'channels' ? 'active' : ''}`} onClick={() => setActiveTab('channels')}>Manage Channels</button>
                        <button className={`tab ${activeTab === 'skills' ? 'active' : ''}`} onClick={() => setActiveTab('skills')}>Skills</button>
                        <button className={`tab ${activeTab === 'agents' ? 'active' : ''}`} onClick={() => setActiveTab('agents')}>Agents</button>
                    </div>
                </div>

                <div className="header-actions">
                    <button><Download size={14} style={{ marginRight: '6px', verticalAlign: 'text-bottom' }} /> Export</button>
                    <button><Upload size={14} style={{ marginRight: '6px', verticalAlign: 'text-bottom' }} /> Import</button>
                    <button><RefreshCw size={14} style={{ marginRight: '6px', verticalAlign: 'text-bottom' }} /> Reload</button>
                    <button className="primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Save size={16} /> Save
                    </button>
                </div>
            </header>

            {isLoading && <div style={{ padding: '40px', color: 'var(--text-secondary)' }}>Loading telemetry...</div>}

            {/* SCROLLING MAIN VIEWPORT */}
            {!isLoading && (
                <main style={{ padding: '0 24px', flex: 1, overflowY: 'auto' }}>
                    {activeTab === 'channels' && renderManageChannels()}
                    {activeTab === 'skills' && renderSkillsTab()}
                    {activeTab === 'agents' && renderAgentsTab()}
                </main>
            )}
            
        </div>
    );
}
