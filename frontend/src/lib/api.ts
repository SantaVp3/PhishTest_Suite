const API_BASE_URL = 'http://localhost:8080/api/v1';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    email: string;
    name: string;
  };
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  status: string;
  template_id?: string;
  created_at: string;
  stats?: {
    total_recipients: number;
    emails_sent: number;
    emails_opened: number;
    links_clicked: number;
    success_rate: number;
  };
}

export interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  subject: string;
  content: string;
  variables?: string[];
  created_at?: string;
  updated_at?: string;
}

class ApiClient {
  private getAuthHeaders() {
    // 从zustand persist store中获取token
    const authStorage = localStorage.getItem('auth-storage');
    let token = null;
    
    if (authStorage) {
      try {
        const parsed = JSON.parse(authStorage);
        token = parsed.state?.token;
      } catch (e) {
        console.error('Failed to parse auth storage:', e);
      }
    }
    
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      throw new Error('登录失败');
    }

    const data = await response.json();
    // Token由authStore管理，这里不需要手动设置
    return data;
  }

  async register(userData: { email: string; password: string; name: string }) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw new Error('注册失败');
    }

    const data = await response.json();
    // Token由authStore管理，这里不需要手动设置
    return data;
  }

  async getCampaigns(): Promise<{ campaigns: Campaign[]; total: number }> {
    const response = await fetch(`${API_BASE_URL}/campaigns`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('获取活动列表失败');
    }

    return response.json();
  }

  async createCampaign(campaignData: any) {
    const response = await fetch(`${API_BASE_URL}/campaigns`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(campaignData),
    });

    if (!response.ok) {
      throw new Error('创建活动失败');
    }

    return response.json();
  }

  async getCampaign(id: string): Promise<Campaign> {
    const response = await fetch(`${API_BASE_URL}/campaigns/${id}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('获取活动详情失败');
    }

    return response.json();
  }

  async updateCampaign(id: string, campaignData: any) {
    const response = await fetch(`${API_BASE_URL}/campaigns/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(campaignData),
    });

    if (!response.ok) {
      throw new Error('更新活动失败');
    }

    return response.json();
  }

  async deleteCampaign(id: string) {
    const response = await fetch(`${API_BASE_URL}/campaigns/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('删除活动失败');
    }

    return response.json();
  }

  async getCampaignStats(id: string) {
    const response = await fetch(`${API_BASE_URL}/campaigns/${id}/stats`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('获取活动统计失败');
    }

    return response.json();
  }

  async startCampaign(id: string, data?: { recipient_ids?: string[], phishing_target_url?: string }) {
    const response = await fetch(`${API_BASE_URL}/campaigns/${id}/launch`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data || { recipient_ids: [], phishing_target_url: 'https://example.com/phishing-test' }),
    });

    if (!response.ok) {
      throw new Error('启动活动失败');
    }

    return response.json();
  }

  async pauseCampaign(id: string) {
    const response = await fetch(`${API_BASE_URL}/campaigns/${id}/pause`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('暂停活动失败');
    }

    return response.json();
  }

  async getTemplates(): Promise<{ templates: Template[]; total: number }> {
    const response = await fetch(`${API_BASE_URL}/templates`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('获取模板列表失败');
    }

    return response.json();
  }

  async createTemplate(templateData: any) {
    const response = await fetch(`${API_BASE_URL}/templates`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(templateData),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: '创建模板失败' }));
      throw new Error(error.error || `创建模板失败 (${response.status})`);
    }

    return response.json();
  }

  async updateTemplate(id: string, templateData: any) {
    const response = await fetch(`${API_BASE_URL}/templates/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(templateData),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: '更新模板失败' }));
      throw new Error(error.error || `更新模板失败 (${response.status})`);
    }

    return response.json();
  }

  async deleteTemplate(id: string) {
    const response = await fetch(`${API_BASE_URL}/templates/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('删除模板失败');
    }

    return response.json();
  }

  async getTemplate(id: string): Promise<Template> {
    const response = await fetch(`${API_BASE_URL}/templates/${id}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('获取模板详情失败');
    }

    return response.json();
  }

  async getRecipients() {
    const response = await fetch(`${API_BASE_URL}/recipients`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('获取收件人列表失败');
    }

    return response.json();
  }

  async createRecipient(recipientData: any) {
    const response = await fetch(`${API_BASE_URL}/recipients`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(recipientData),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: '创建收件人失败' }));
      throw new Error(error.error || `创建收件人失败 (${response.status})`);
    }

    return response.json();
  }

  async bulkImportRecipients(recipients: any[]) {
    const response = await fetch(`${API_BASE_URL}/recipients/bulk-import`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ recipients }),
    });

    if (!response.ok) {
      throw new Error('批量导入失败');
    }

    return response.json();
  }

  // 收件人分组管理
  async getGroups() {
    const response = await fetch(`${API_BASE_URL}/recipients/groups`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('获取分组列表失败');
    }

    return response.json();
  }

  async createGroup(groupData: any) {
    const response = await fetch(`${API_BASE_URL}/recipients/groups`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(groupData),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: '创建分组失败' }));
      throw new Error(error.error || `创建分组失败 (${response.status})`);
    }

    return response.json();
  }

  async getGroup(id: string) {
    const response = await fetch(`${API_BASE_URL}/recipients/groups/${id}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('获取分组详情失败');
    }

    return response.json();
  }

  async updateGroup(id: string, groupData: any) {
    const response = await fetch(`${API_BASE_URL}/recipients/groups/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(groupData),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: '更新分组失败' }));
      throw new Error(error.error || `更新分组失败 (${response.status})`);
    }

    return response.json();
  }

  async deleteGroup(id: string) {
    const response = await fetch(`${API_BASE_URL}/recipients/groups/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('删除分组失败');
    }

    return response.json();
  }

  async getAnalytics() {
    const response = await fetch(`${API_BASE_URL}/analytics/dashboard`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('获取分析数据失败');
    }

    const data = await response.json();
    
    // 转换后端数据格式为前端期望的格式
    return {
      overview: {
        totalCampaigns: data.dashboard.total_campaigns || 0,
        activeCampaigns: data.dashboard.active_campaigns || 0,
        totalRecipients: data.dashboard.total_recipients || 0,
        overallSuccessRate: data.dashboard.overall_success_rate || 0
      },
      campaignStats: {
        emailsSent: data.dashboard.total_emails_sent || 0,
        emailsOpened: data.dashboard.total_emails_opened || 0,
        linksClicked: data.dashboard.total_links_clicked || 0,
        dataSubmitted: data.dashboard.total_links_clicked || 0,
        openRate: data.dashboard.total_emails_sent > 0 ? 
          (data.dashboard.total_emails_opened / data.dashboard.total_emails_sent) * 100 : 0,
        clickRate: data.dashboard.total_emails_sent > 0 ? 
          (data.dashboard.total_links_clicked / data.dashboard.total_emails_sent) * 100 : 0,
        successRate: data.dashboard.overall_success_rate || 0
      },
      riskAssessment: {
        highRisk: 0,
        mediumRisk: 0,
        lowRisk: 0,
        riskScore: 0
      },
      recentActivity: [],
      topVulnerabilities: data.dashboard.department_stats?.map((dept: any) => ({
        department: dept.department || '未知部门',
        successRate: dept.success_rate || 0,
        totalTests: dept.recipients || 0,
        riskLevel: dept.success_rate > 30 ? 'high' : dept.success_rate > 15 ? 'medium' : 'low'
      })) || []
    };
  }

  logout() {
    // Token由authStore管理，这里不需要手动清除
  }

  // 系统设置管理
  async getSettings() {
    const response = await fetch(`${API_BASE_URL}/settings`, {
      headers: this.getAuthHeaders()
    })
    if (!response.ok) {
      throw new Error('获取设置失败')
    }
    return response.json()
  }

  async updateSettings(settings: any) {
    const response = await fetch(`${API_BASE_URL}/settings`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(settings)
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '保存设置失败')
    }
    return response.json()
  }

  async resetSettings() {
    const response = await fetch(`${API_BASE_URL}/settings/reset`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    })
    if (!response.ok) {
      throw new Error('重置设置失败')
    }
    return response.json()
  }
}

export const apiClient = new ApiClient();