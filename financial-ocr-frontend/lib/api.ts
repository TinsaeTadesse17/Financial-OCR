const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// Mock data for testing
const mockUsers = [
  {
    id: "1",
    username: "testuser",
    email: "test@example.com",
    registration_date: "2024-01-15T10:30:00Z",
    is_active: true,
    is_admin: false,
  },
  {
    id: "2",
    username: "admin",
    email: "admin@example.com",
    registration_date: "2024-01-10T09:00:00Z",
    is_active: true,
    is_admin: true,
  },
]

const mockDocuments = [
  {
    id: "doc1",
    task_id: "task_123",
    filename: "financial_report_2024.pdf",
    upload_timestamp: "2024-01-20T14:30:00Z",
    status: "completed",
    result: {
      success: true,
      document_type: "pdf",
      parsed_document: [
        {
          Date: "2024-01-15",
          Name: "Office Supplies",
          Amount: "$125.50",
        },
        {
          Date: "2024-01-16",
          Name: "Software License",
          Amount: "$299.99",
        },
        {
          Date: "2024-01-17",
          Name: "Travel Expenses",
          Amount: "$450.00",
        },
      ],
    },
    original_image_url: "/placeholder.svg?height=600&width=400",
  },
  {
    id: "doc2",
    task_id: "task_124",
    filename: "invoice_001.png",
    upload_timestamp: "2024-01-19T11:15:00Z",
    status: "processing",
    result: null,
  },
  {
    id: "doc3",
    task_id: "task_125",
    filename: "receipt_grocery.jpg",
    upload_timestamp: "2024-01-18T16:45:00Z",
    status: "failed",
    result: null,
    error_message: "Unable to extract text from image",
  },
]

class ApiService {
  private mockMode = false // Disabled mock mode to use real backend endpoints

  private getAuthHeaders() {
    const token = localStorage.getItem("auth_token")
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  private async mockDelay(ms = 1000) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async request(endpoint: string, options: RequestInit = {}) {
    if (this.mockMode) {
      return this.handleMockRequest(endpoint, options)
    }

    const url = `${API_BASE_URL}${endpoint}`
    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      ...options,
    }

    const response = await fetch(url, config)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "An error occurred" }))
      throw new Error(error.message || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  private async handleMockRequest(endpoint: string, options: RequestInit = {}) {
    await this.mockDelay(500) // Simulate network delay

    const method = options.method || "GET"

    // Mock authentication endpoints
    if (endpoint === "/auth/login" && method === "POST") {
      return { access_token: "mock_jwt_token", token_type: "bearer" }
    }

    if (endpoint === "/auth/register" && method === "POST") {
      return { message: "User registered successfully" }
    }

    if (endpoint === "/auth/me") {
      const token = localStorage.getItem("auth_token")
      if (!token) throw new Error("Not authenticated")

      // Return admin user if token exists (for demo)
      return mockUsers[0]
    }

    // Mock document endpoints
    if (endpoint === "/documents/") {
      return mockDocuments
    }

    if (endpoint.startsWith("/documents/") && !endpoint.includes("/status")) {
      const id = endpoint.split("/")[2]
      const doc = mockDocuments.find((d) => d.id === id)
      if (!doc) throw new Error("Document not found")
      return doc
    }

    // Mock task status endpoint
    if (endpoint.startsWith("/tasks/")) {
      const taskId = endpoint.split("/")[2]
      const doc = mockDocuments.find((d) => d.task_id === taskId)
      if (!doc) throw new Error("Task not found")

      return {
        task_id: taskId,
        status: doc.status,
        result: doc.result,
      }
    }

    // Mock admin endpoints
    if (endpoint === "/admin/users") {
      return mockUsers
    }

    if (endpoint.includes("/admin/users/") && endpoint.includes("/deactivate")) {
      return { message: "User deactivated successfully" }
    }

    throw new Error(`Mock endpoint not implemented: ${endpoint}`)
  }

  // Auth endpoints
  async login(email: string, password: string) {
    if (this.mockMode) {
      await this.mockDelay(800)

      // Simple mock validation
      if (email === "test@example.com" && password === "TestPassword123!") {
        return { access_token: "mock_jwt_token", token_type: "bearer" }
      } else if (email === "admin@example.com" && password === "AdminPassword123!") {
        return { access_token: "mock_admin_token", token_type: "bearer" }
      } else {
        throw new Error("Invalid credentials")
      }
    }

    const formData = new FormData()
    formData.append("username", email)
    formData.append("password", password)

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error("Invalid credentials")
    }

    return response.json()
  }

  async register(username: string, email: string, password: string) {
    if (this.mockMode) {
      await this.mockDelay(1000)
      return { message: "User registered successfully" }
    }

    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    })
  }

  async getCurrentUser() {
    if (this.mockMode) {
      await this.mockDelay(300)
      const token = localStorage.getItem("auth_token")
      if (!token) throw new Error("Not authenticated")

      // Return different users based on token for demo
      if (token === "mock_admin_token") {
        return mockUsers[1] // admin user
      }
      return mockUsers[0] // regular user
    }

    return this.request("/auth/me")
  }

  // File upload endpoints
  async uploadFiles(files: File[]) {
    if (this.mockMode) {
      await this.mockDelay(2000) // Simulate longer upload time

      // Add mock documents to the list
      const newDocs = files.map((file, index) => ({
        id: `doc_${Date.now()}_${index}`,
        task_id: `task_${Date.now()}_${index}`,
        filename: file.name,
        upload_timestamp: new Date().toISOString(),
        status: "processing" as const,
        result: null,
      }))

      mockDocuments.unshift(...newDocs)
      return {
        message: `${files.length} files uploaded successfully`,
        documents: newDocs.map((doc) => ({ task_id: doc.task_id, filename: doc.filename })),
      }
    }

    const formData = new FormData()
    files.forEach((file) => {
      formData.append("files", file)
    })

    const token = localStorage.getItem("auth_token")
    const response = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    })

    if (!response.ok) {
      throw new Error("Upload failed")
    }

    return response.json()
  }

  // Document endpoints
  async getDocuments() {
    return this.request("/documents/")
  }

  async getDocument(id: string) {
    return this.request(`/documents/${id}`)
  }

  // Task status endpoint - NEW
  async getTaskStatus(taskId: string) {
    if (this.mockMode) {
      return this.handleMockRequest(`/tasks/${taskId}`)
    }
    return this.request(`/tasks/${taskId}`)
  }

  async getDocumentStatus(id: string) {
    return this.request(`/documents/${id}/status`)
  }

  // Admin endpoints
  async getUsers() {
    return this.request("/admin/users")
  }

  async deactivateUser(userId: string) {
    return this.request(`/admin/users/${userId}/deactivate`, {
      method: "POST",
    })
  }

  // Method to toggle between mock and real API
  setMockMode(enabled: boolean) {
    this.mockMode = enabled
  }
}

export const apiService = new ApiService()
