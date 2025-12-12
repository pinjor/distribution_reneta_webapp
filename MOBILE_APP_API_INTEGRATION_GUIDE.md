# Mobile App API Integration Guide
## Memo Acceptance System

This guide provides complete step-by-step instructions for integrating the Memo Acceptance API into your mobile application.

---

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [API Base URL](#api-base-url)
4. [Authentication](#authentication)
5. [API Endpoints](#api-endpoints)
6. [Step-by-Step Integration](#step-by-step-integration)
7. [Code Examples](#code-examples)
8. [Error Handling](#error-handling)
9. [Testing Checklist](#testing-checklist)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Mobile Memo Acceptance API allows mobile app users to:
- View all assigned memos available for acceptance
- Accept memos from their mobile device
- Track acceptance status
- View their own accepted memos

**Workflow:**
1. Admin assigns orders in web app → Orders get `loading_number`
2. Mobile app users see all assigned memos
3. Users can accept memos from mobile app
4. Web app shows acceptance status per loading number

---

## Prerequisites

- ✅ Backend server is running
- ✅ Database migration completed (mobile acceptance fields added)
- ✅ Mobile app development environment set up
- ✅ HTTP client library (Axios, Fetch, Retrofit, OkHttp, etc.)
- ✅ JSON parsing library

---

## API Base URL

**Production:** `https://your-domain.com/api/mobile`  
**Development/Testing:** `http://localhost/api/mobile`  
**Docker Setup:** `http://localhost/api/mobile`

**Note:** All endpoints are prefixed with `/api/mobile`

---

## Authentication

Currently, the API endpoints do not require authentication tokens. However, you should implement user identification through the `user_id` parameter when accepting memos.

**Future Enhancement:** The API can be extended to require Bearer token authentication.

---

## API Endpoints

### 1. Get Assigned Memos

**Endpoint:** `GET /api/mobile/assigned-memos`

**Description:**  
Returns all memos that have been assigned (have loading numbers) and are available for mobile users to accept.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `skip` | integer | No | 0 | Number of records to skip (for pagination) |
| `limit` | integer | No | 100 | Maximum number of records to return |

**Request Example:**
```http
GET /api/mobile/assigned-memos?skip=0&limit=50
Host: localhost
Content-Type: application/json
```

**Response (200 OK):**
```json
[
  {
    "id": 29,
    "order_id": 29,
    "memo_number": "23295051",
    "order_number": "order-29",
    "loading_number": "20251127-0001",
    "customer_name": "Heraj Market Pharmacy",
    "customer_code": "CUST-07002",
    "route_code": "R-1",
    "route_name": "Route R-1",
    "delivery_date": "2025-11-27",
    "assigned_employee_id": 1,
    "assigned_employee_name": "Rahim Uddin",
    "assigned_vehicle_id": 3,
    "assigned_vehicle_registration": "KA-03-EF-9012",
    "assignment_date": "2025-11-27T07:41:47.291938",
    "items_count": 1,
    "total_value": 12600.0,
    "mobile_accepted": false,
    "mobile_accepted_by": null,
    "mobile_accepted_at": null,
    "area": "Route R-1",
    "status": "Available"
  },
  {
    "id": 17,
    "order_id": 17,
    "memo_number": "74674662",
    "order_number": "order-17",
    "loading_number": "20251129-0001",
    "customer_name": "Rajbari Community Clinic",
    "customer_code": "CUST-20046",
    "route_code": "R-3",
    "route_name": "Route R-3",
    "delivery_date": "2025-11-27",
    "assigned_employee_id": 1,
    "assigned_employee_name": "Rahim Uddin",
    "assigned_vehicle_id": 4,
    "assigned_vehicle_registration": "KA-04-GH-3456",
    "assignment_date": "2025-11-29T06:10:54.011076",
    "items_count": 4,
    "total_value": 37775.46,
    "mobile_accepted": false,
    "mobile_accepted_by": null,
    "mobile_accepted_at": null,
    "area": "Route R-3",
    "status": "Available"
  }
]
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Order ID |
| `order_id` | integer | Order ID (same as id) |
| `memo_number` | string | 8-digit memo number |
| `order_number` | string | Order number (e.g., "order-29") |
| `loading_number` | string | Loading number (e.g., "20251127-0001") |
| `customer_name` | string | Customer name |
| `customer_code` | string | Customer code |
| `route_code` | string | Route code |
| `route_name` | string | Route name |
| `delivery_date` | string | Delivery date (ISO format) |
| `assigned_employee_id` | integer | Assigned employee ID |
| `assigned_employee_name` | string | Assigned employee name |
| `assigned_vehicle_id` | integer | Assigned vehicle ID |
| `assigned_vehicle_registration` | string | Vehicle registration number |
| `assignment_date` | string | Assignment timestamp (ISO format) |
| `items_count` | integer | Number of items in order |
| `total_value` | float | Total order value |
| `mobile_accepted` | boolean | Whether memo was accepted by mobile user |
| `mobile_accepted_by` | string/null | User ID who accepted (null if not accepted) |
| `mobile_accepted_at` | string/null | Acceptance timestamp (null if not accepted) |
| `area` | string | Delivery area |
| `status` | string | Status ("Available" or "Accepted") |

**Error Responses:**
- `500 Internal Server Error`: Server error

---

### 2. Accept a Memo

**Endpoint:** `POST /api/mobile/accept-memo`

**Description:**  
Allows a mobile user to accept a memo. Once accepted, the memo is marked as accepted and tracked.

**Request Body:**
```json
{
  "memo_number": "23295051",    // Either memo_number OR order_id required
  "order_id": 29,                // Optional if memo_number provided
  "user_id": "mobile_user_123"   // Required: Mobile app user ID
}
```

**Request Example:**
```http
POST /api/mobile/accept-memo
Host: localhost
Content-Type: application/json

{
  "memo_number": "23295051",
  "user_id": "mobile_user_123"
}
```

**Response (200 OK - Success):**
```json
{
  "success": true,
  "message": "Memo 23295051 accepted successfully",
  "memo_number": "23295051",
  "loading_number": "20251127-0001",
  "accepted_at": "2025-12-08T14:35:00.123456",
  "accepted_by": "mobile_user_123"
}
```

**Response (200 OK - Already Accepted):**
```json
{
  "success": true,
  "message": "Memo 23295051 was already accepted",
  "memo_number": "23295051",
  "loading_number": "20251127-0001",
  "accepted_at": "2025-12-08T14:30:00.123456",
  "accepted_by": "mobile_user_456"
}
```

**Error Responses:**
- `404 Not Found`: Memo not found
  ```json
  {
    "detail": "Memo not found"
  }
  ```
- `422 Unprocessable Entity`: Validation error
  ```json
  {
    "detail": [
      {
        "loc": ["body", "user_id"],
        "msg": "field required",
        "type": "value_error.missing"
      }
    ]
  }
  ```
- `500 Internal Server Error`: Server error

---

### 3. Get Loading Number Status

**Endpoint:** `GET /api/mobile/loading-number/{loading_number}/status`

**Description:**  
Returns the acceptance status for all memos in a specific loading number. Useful for showing acceptance progress.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `loading_number` | string | Yes | The loading number (e.g., "20251127-0001") |

**Request Example:**
```http
GET /api/mobile/loading-number/20251127-0001/status
Host: localhost
Content-Type: application/json
```

**Response (200 OK):**
```json
{
  "loading_number": "20251127-0001",
  "total_memos": 10,
  "accepted_memos": 7,
  "pending_memos": 3,
  "acceptance_rate": 70.0,
  "all_accepted": false,
  "memos": [
    {
      "memo_number": "23295051",
      "order_id": 29,
      "customer_name": "Heraj Market Pharmacy",
      "accepted": true,
      "accepted_by": "mobile_user_123",
      "accepted_at": "2025-12-08T14:35:00.123456"
    },
    {
      "memo_number": "74674662",
      "order_id": 17,
      "customer_name": "Rajbari Community Clinic",
      "accepted": false,
      "accepted_by": null,
      "accepted_at": null
    }
  ]
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `loading_number` | string | Loading number |
| `total_memos` | integer | Total number of memos in this loading number |
| `accepted_memos` | integer | Number of accepted memos |
| `pending_memos` | integer | Number of pending memos |
| `acceptance_rate` | float | Percentage of accepted memos (0-100) |
| `all_accepted` | boolean | Whether all memos are accepted |
| `memos` | array | List of individual memo statuses |

**Memo Object in Array:**
| Field | Type | Description |
|-------|------|-------------|
| `memo_number` | string | Memo number |
| `order_id` | integer | Order ID |
| `customer_name` | string | Customer name |
| `accepted` | boolean | Whether this memo is accepted |
| `accepted_by` | string/null | User ID who accepted |
| `accepted_at` | string/null | Acceptance timestamp |

**Error Responses:**
- `404 Not Found`: Loading number not found
  ```json
  {
    "detail": "No orders found for loading number 20251127-0001"
  }
  ```

---

### 4. Get My Accepted Memos

**Endpoint:** `GET /api/mobile/my-accepted-memos?user_id={user_id}`

**Description:**  
Returns all memos that have been accepted by a specific mobile user.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | string | Yes | Mobile app user ID |
| `skip` | integer | No | 0 | Number of records to skip |
| `limit` | integer | No | 100 | Maximum number of records to return |

**Request Example:**
```http
GET /api/mobile/my-accepted-memos?user_id=mobile_user_123&skip=0&limit=50
Host: localhost
Content-Type: application/json
```

**Response (200 OK):**
```json
[
  {
    "id": 29,
    "order_id": 29,
    "memo_number": "23295051",
    "order_number": "order-29",
    "loading_number": "20251127-0001",
    "customer_name": "Heraj Market Pharmacy",
    "customer_code": "CUST-07002",
    "route_code": "R-1",
    "route_name": "Route R-1",
    "delivery_date": "2025-11-27",
    "assigned_employee_id": 1,
    "assigned_employee_name": "Rahim Uddin",
    "assigned_vehicle_id": 3,
    "assigned_vehicle_registration": "KA-03-EF-9012",
    "assignment_date": "2025-11-27T07:41:47.291938",
    "items_count": 1,
    "total_value": 12600.0,
    "mobile_accepted": true,
    "mobile_accepted_by": "mobile_user_123",
    "mobile_accepted_at": "2025-12-08T14:35:00.123456",
    "area": "Route R-1",
    "status": "Accepted"
  }
]
```

**Response Format:**  
Same as `/assigned-memos`, but:
- Only includes memos accepted by the specified `user_id`
- `mobile_accepted` is always `true`
- `status` is always `"Accepted"`

---

## Step-by-Step Integration

### Step 1: Setup API Client

#### React Native (TypeScript/JavaScript)

```typescript
// services/apiClient.ts
const API_BASE_URL = 'http://your-api-domain.com/api/mobile';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const error = await response.json();
        return { error: error.detail || 'Request failed' };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error.message || 'Network error' };
    }
  }

  async getAssignedMemos(skip = 0, limit = 100) {
    return this.request(
      `/assigned-memos?skip=${skip}&limit=${limit}`
    );
  }

  async acceptMemo(memoNumber: string, userId: string) {
    return this.request('/accept-memo', {
      method: 'POST',
      body: JSON.stringify({
        memo_number: memoNumber,
        user_id: userId,
      }),
    });
  }

  async getLoadingNumberStatus(loadingNumber: string) {
    return this.request(`/loading-number/${loadingNumber}/status`);
  }

  async getMyAcceptedMemos(userId: string, skip = 0, limit = 100) {
    return this.request(
      `/my-accepted-memos?user_id=${userId}&skip=${skip}&limit=${limit}`
    );
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
```

#### Flutter (Dart)

```dart
// services/api_client.dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiClient {
  final String baseUrl;

  ApiClient({required this.baseUrl});

  Future<Map<String, dynamic>> request(
    String endpoint, {
    String method = 'GET',
    Map<String, dynamic>? body,
  }) async {
    try {
      final url = Uri.parse('$baseUrl$endpoint');
      http.Response response;

      if (method == 'GET') {
        response = await http.get(url);
      } else if (method == 'POST') {
        response = await http.post(
          url,
          headers: {'Content-Type': 'application/json'},
          body: body != null ? jsonEncode(body) : null,
        );
      } else {
        throw Exception('Unsupported method: $method');
      }

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['detail'] ?? 'Request failed');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  Future<List<dynamic>> getAssignedMemos({int skip = 0, int limit = 100}) async {
    final response = await request('/assigned-memos?skip=$skip&limit=$limit');
    return List<dynamic>.from(response);
  }

  Future<Map<String, dynamic>> acceptMemo(String memoNumber, String userId) async {
    return await request(
      '/accept-memo',
      method: 'POST',
      body: {
        'memo_number': memoNumber,
        'user_id': userId,
      },
    );
  }

  Future<Map<String, dynamic>> getLoadingNumberStatus(String loadingNumber) async {
    return await request('/loading-number/$loadingNumber/status');
  }

  Future<List<dynamic>> getMyAcceptedMemos(
    String userId, {
    int skip = 0,
    int limit = 100,
  }) async {
    final response = await request(
      '/my-accepted-memos?user_id=$userId&skip=$skip&limit=$limit',
    );
    return List<dynamic>.from(response);
  }
}
```

#### Native Android (Kotlin)

```kotlin
// ApiClient.kt
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject

class ApiClient(private val baseUrl: String) {
    private val client = OkHttpClient()
    private val mediaType = "application/json".toMediaType()

    fun getAssignedMemos(
        skip: Int = 0,
        limit: Int = 100,
        callback: (Result<List<Memo>>) -> Unit
    ) {
        val request = Request.Builder()
            .url("$baseUrl/assigned-memos?skip=$skip&limit=$limit")
            .get()
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(Result.failure(e))
            }

            override fun onResponse(call: Call, response: Response) {
                if (response.isSuccessful) {
                    val jsonArray = JSONArray(response.body?.string())
                    val memos = parseMemos(jsonArray)
                    callback(Result.success(memos))
                } else {
                    callback(Result.failure(Exception("Request failed")))
                }
            }
        })
    }

    fun acceptMemo(
        memoNumber: String,
        userId: String,
        callback: (Result<AcceptResponse>) -> Unit
    ) {
        val json = JSONObject().apply {
            put("memo_number", memoNumber)
            put("user_id", userId)
        }

        val body = json.toString().toRequestBody(mediaType)
        val request = Request.Builder()
            .url("$baseUrl/accept-memo")
            .post(body)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(Result.failure(e))
            }

            override fun onResponse(call: Call, response: Response) {
                if (response.isSuccessful) {
                    val jsonObject = JSONObject(response.body?.string())
                    val result = AcceptResponse.fromJson(jsonObject)
                    callback(Result.success(result))
                } else {
                    callback(Result.failure(Exception("Request failed")))
                }
            }
        })
    }

    // Add other methods similarly...
}
```

#### Native iOS (Swift)

```swift
// ApiClient.swift
import Foundation

class ApiClient {
    let baseUrl: String
    
    init(baseUrl: String) {
        self.baseUrl = baseUrl
    }
    
    func getAssignedMemos(skip: Int = 0, limit: Int = 100, completion: @escaping (Result<[Memo], Error>) -> Void) {
        guard let url = URL(string: "\(baseUrl)/assigned-memos?skip=\(skip)&limit=\(limit)") else {
            completion(.failure(ApiError.invalidUrl))
            return
        }
        
        URLSession.shared.dataTask(with: url) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let data = data else {
                completion(.failure(ApiError.noData))
                return
            }
            
            do {
                let memos = try JSONDecoder().decode([Memo].self, from: data)
                completion(.success(memos))
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }
    
    func acceptMemo(memoNumber: String, userId: String, completion: @escaping (Result<AcceptResponse, Error>) -> Void) {
        guard let url = URL(string: "\(baseUrl)/accept-memo") else {
            completion(.failure(ApiError.invalidUrl))
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = [
            "memo_number": memoNumber,
            "user_id": userId
        ]
        
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let data = data else {
                completion(.failure(ApiError.noData))
                return
            }
            
            do {
                let result = try JSONDecoder().decode(AcceptResponse.self, from: data)
                completion(.success(result))
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }
}
```

---

### Step 2: Create Data Models

#### TypeScript/JavaScript

```typescript
// models/Memo.ts
export interface Memo {
  id: number;
  order_id: number;
  memo_number: string | null;
  order_number: string;
  loading_number: string | null;
  customer_name: string;
  customer_code: string | null;
  route_code: string | null;
  route_name: string | null;
  delivery_date: string | null;
  assigned_employee_id: number | null;
  assigned_employee_name: string | null;
  assigned_vehicle_id: number | null;
  assigned_vehicle_registration: string | null;
  assignment_date: string | null;
  items_count: number;
  total_value: number;
  mobile_accepted: boolean;
  mobile_accepted_by: string | null;
  mobile_accepted_at: string | null;
  area: string | null;
  status: string;
}

export interface AcceptMemoRequest {
  memo_number?: string;
  order_id?: number;
  user_id: string;
}

export interface AcceptMemoResponse {
  success: boolean;
  message: string;
  memo_number: string | null;
  loading_number: string | null;
  accepted_at: string | null;
  accepted_by: string | null;
}

export interface LoadingNumberStatus {
  loading_number: string;
  total_memos: number;
  accepted_memos: number;
  pending_memos: number;
  acceptance_rate: number;
  all_accepted: boolean;
  memos: Array<{
    memo_number: string;
    order_id: number;
    customer_name: string;
    accepted: boolean;
    accepted_by: string | null;
    accepted_at: string | null;
  }>;
}
```

---

### Step 3: Implement UI Screens

#### Screen 1: Memo List Screen

**Purpose:** Display all available memos for acceptance

**Implementation Steps:**

1. **Create the Screen Component**
```typescript
// screens/MemoListScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, FlatList, RefreshControl, Alert } from 'react-native';
import { apiClient } from '../services/apiClient';
import { Memo } from '../models/Memo';
import MemoCard from '../components/MemoCard';

export default function MemoListScreen() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMemos();
  }, []);

  const loadMemos = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getAssignedMemos();
      if (response.data) {
        setMemos(response.data);
      } else if (response.error) {
        Alert.alert('Error', response.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load memos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMemos();
  };

  return (
    <View>
      <FlatList
        data={memos}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <MemoCard memo={item} onAccept={handleAccept} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
}
```

2. **Create Memo Card Component**
```typescript
// components/MemoCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Memo } from '../models/Memo';

interface Props {
  memo: Memo;
  onAccept: (memo: Memo) => void;
}

export default function MemoCard({ memo, onAccept }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.memoNumber}>
          Memo: {memo.memo_number || 'N/A'}
        </Text>
        {memo.mobile_accepted ? (
          <Text style={styles.acceptedBadge}>✓ Accepted</Text>
        ) : (
          <Text style={styles.availableBadge}>Available</Text>
        )}
      </View>
      
      <Text style={styles.customerName}>{memo.customer_name}</Text>
      <Text style={styles.customerCode}>Code: {memo.customer_code}</Text>
      
      <View style={styles.details}>
        <Text>Loading: {memo.loading_number}</Text>
        <Text>Route: {memo.route_name}</Text>
        <Text>Items: {memo.items_count}</Text>
        <Text>Value: ₹{memo.total_value.toFixed(2)}</Text>
      </View>

      {!memo.mobile_accepted && (
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => onAccept(memo)}
        >
          <Text style={styles.acceptButtonText}>Accept Memo</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
```

---

#### Screen 2: Accept Memo Functionality

**Implementation:**

```typescript
// In your MemoListScreen or MemoCard component
const handleAccept = async (memo: Memo) => {
  if (!memo.memo_number) {
    Alert.alert('Error', 'Memo number is missing');
    return;
  }

  // Get current user ID (from your auth system)
  const userId = getCurrentUserId(); // Implement this function

  Alert.alert(
    'Accept Memo',
    `Do you want to accept memo ${memo.memo_number}?`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept',
        onPress: async () => {
          try {
            const response = await apiClient.acceptMemo(
              memo.memo_number!,
              userId
            );

            if (response.data) {
              Alert.alert('Success', response.data.message);
              // Refresh the memo list
              loadMemos();
            } else if (response.error) {
              Alert.alert('Error', response.error);
            }
          } catch (error) {
            Alert.alert('Error', 'Failed to accept memo');
          }
        },
      },
    ]
  );
};
```

---

#### Screen 3: My Accepted Memos Screen

```typescript
// screens/MyAcceptedMemosScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, FlatList } from 'react-native';
import { apiClient } from '../services/apiClient';
import { Memo } from '../models/Memo';
import MemoCard from '../components/MemoCard';

export default function MyAcceptedMemosScreen() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const userId = getCurrentUserId();

  useEffect(() => {
    loadAcceptedMemos();
  }, []);

  const loadAcceptedMemos = async () => {
    try {
      const response = await apiClient.getMyAcceptedMemos(userId);
      if (response.data) {
        setMemos(response.data);
      }
    } catch (error) {
      // Handle error
    }
  };

  return (
    <FlatList
      data={memos}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => <MemoCard memo={item} />}
    />
  );
}
```

---

### Step 4: Implement Pull-to-Refresh

```typescript
// Add to your memo list screen
const [refreshing, setRefreshing] = useState(false);

const onRefresh = async () => {
  setRefreshing(true);
  await loadMemos();
  setRefreshing(false);
};

// In your FlatList
<FlatList
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  }
  // ... other props
/>
```

---

### Step 5: Implement Pagination (Optional)

```typescript
const [page, setPage] = useState(0);
const [hasMore, setHasMore] = useState(true);
const limit = 20;

const loadMemos = async (pageNum: number = 0) => {
  try {
    const response = await apiClient.getAssignedMemos(
      pageNum * limit,
      limit
    );
    
    if (response.data) {
      if (pageNum === 0) {
        setMemos(response.data);
      } else {
        setMemos(prev => [...prev, ...response.data]);
      }
      
      // Check if there are more items
      setHasMore(response.data.length === limit);
    }
  } catch (error) {
    // Handle error
  }
};

const loadMore = () => {
  if (hasMore && !loading) {
    const nextPage = page + 1;
    setPage(nextPage);
    loadMemos(nextPage);
  }
};

// In FlatList
<FlatList
  onEndReached={loadMore}
  onEndReachedThreshold={0.5}
  // ... other props
/>
```

---

### Step 6: Error Handling

```typescript
// utils/errorHandler.ts
export function handleApiError(error: any): string {
  if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    const data = error.response.data;

    switch (status) {
      case 404:
        return data.detail || 'Resource not found';
      case 422:
        return 'Invalid request data';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return data.detail || 'An error occurred';
    }
  } else if (error.request) {
    // Request made but no response
    return 'Network error. Please check your connection.';
  } else {
    // Something else happened
    return error.message || 'An unexpected error occurred';
  }
}

// Usage
try {
  const response = await apiClient.acceptMemo(memoNumber, userId);
  // Handle success
} catch (error) {
  const errorMessage = handleApiError(error);
  Alert.alert('Error', errorMessage);
}
```

---

### Step 7: Loading States

```typescript
// components/LoadingIndicator.tsx
import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';

export default function LoadingIndicator({ message = 'Loading...' }) {
  return (
    <View style={{ padding: 20, alignItems: 'center' }}>
      <ActivityIndicator size="large" />
      <Text style={{ marginTop: 10 }}>{message}</Text>
    </View>
  );
}

// Usage in screen
{loading ? (
  <LoadingIndicator message="Loading memos..." />
) : (
  <FlatList data={memos} ... />
)}
```

---

## Code Examples

### Complete React Native Example

```typescript
// App.tsx (Main integration example)
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { apiClient } from './services/apiClient';
import { Memo } from './models/Memo';

export default function App() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const userId = 'mobile_user_123'; // Get from your auth system

  useEffect(() => {
    loadMemos();
  }, []);

  const loadMemos = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getAssignedMemos(0, 100);
      if (response.data) {
        setMemos(response.data);
      } else if (response.error) {
        Alert.alert('Error', response.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load memos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAccept = async (memo: Memo) => {
    if (!memo.memo_number) {
      Alert.alert('Error', 'Memo number is missing');
      return;
    }

    Alert.alert(
      'Accept Memo',
      `Accept memo ${memo.memo_number}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              const response = await apiClient.acceptMemo(
                memo.memo_number!,
                userId
              );

              if (response.data) {
                Alert.alert('Success', response.data.message);
                loadMemos(); // Refresh list
              } else if (response.error) {
                Alert.alert('Error', response.error);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to accept memo');
            }
          },
        },
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMemos();
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
        Available Memos
      </Text>

      {loading && memos.length === 0 ? (
        <Text>Loading...</Text>
      ) : (
        <FlatList
          data={memos}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => (
            <View
              style={{
                padding: 16,
                marginBottom: 12,
                backgroundColor: '#f5f5f5',
                borderRadius: 8,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontWeight: 'bold' }}>
                  Memo: {item.memo_number || 'N/A'}
                </Text>
                {item.mobile_accepted ? (
                  <Text style={{ color: 'green' }}>✓ Accepted</Text>
                ) : (
                  <Text style={{ color: 'blue' }}>Available</Text>
                )}
              </View>
              <Text style={{ marginTop: 8 }}>{item.customer_name}</Text>
              <Text>Loading: {item.loading_number}</Text>
              <Text>Route: {item.route_name}</Text>
              <Text>Value: ₹{item.total_value.toFixed(2)}</Text>
              
              {!item.mobile_accepted && (
                <TouchableOpacity
                  style={{
                    marginTop: 12,
                    padding: 12,
                    backgroundColor: '#007AFF',
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                  onPress={() => handleAccept(item)}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>
                    Accept Memo
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}
```

---

## Error Handling

### Common Error Scenarios

1. **Network Error**
   - **Cause:** No internet connection or server unreachable
   - **Solution:** Show user-friendly message, allow retry
   ```typescript
   catch (error) {
     if (error.message === 'Network request failed') {
       Alert.alert('No Internet', 'Please check your connection');
     }
   }
   ```

2. **404 Not Found**
   - **Cause:** Memo doesn't exist
   - **Solution:** Show error message, refresh list

3. **Already Accepted**
   - **Cause:** Memo was already accepted by another user
   - **Solution:** The API returns success with message "already accepted"

4. **Validation Error**
   - **Cause:** Missing required fields (user_id, memo_number)
   - **Solution:** Validate input before sending request

---

## Testing Checklist

### Unit Testing

- [ ] API client methods return correct data structure
- [ ] Error handling works correctly
- [ ] Data models match API response

### Integration Testing

- [ ] Can fetch assigned memos
- [ ] Can accept a memo
- [ ] Can view accepted memos
- [ ] Can check loading number status
- [ ] Pull-to-refresh works
- [ ] Pagination works (if implemented)
- [ ] Error messages display correctly
- [ ] Loading states show correctly

### Manual Testing

- [ ] Test with no internet connection
- [ ] Test with slow internet connection
- [ ] Test accepting same memo twice
- [ ] Test with invalid memo number
- [ ] Test with empty memo list
- [ ] Test pagination with large dataset

---

## Troubleshooting

### Issue: "Unable to connect to server"

**Possible Causes:**
- Backend server not running
- Wrong API base URL
- Network configuration issue

**Solutions:**
1. Verify backend server is running
2. Check API base URL in your code
3. Test API in browser/Postman first
4. Check CORS settings if testing from web

---

### Issue: "404 Not Found" on endpoints

**Possible Causes:**
- Wrong endpoint path
- Router not registered
- API prefix incorrect

**Solutions:**
1. Verify endpoint path matches documentation
2. Check that mobile router is registered in backend
3. Ensure using `/api/mobile` prefix

---

### Issue: Memos not showing

**Possible Causes:**
- No assigned memos in database
- Orders don't have loading_number
- Filter logic excluding memos

**Solutions:**
1. Check database for orders with `loading_number`
2. Verify orders have `assigned_to` and `assigned_vehicle`
3. Test API directly in browser/Postman

---

### Issue: Can't accept memo

**Possible Causes:**
- Missing memo_number
- Invalid user_id
- Memo already accepted
- Network error

**Solutions:**
1. Verify memo_number exists in the memo object
2. Ensure user_id is provided
3. Check if memo.mobile_accepted is already true
4. Check network connectivity

---

## Best Practices

1. **Error Handling:** Always handle errors gracefully
2. **Loading States:** Show loading indicators during API calls
3. **Refresh:** Implement pull-to-refresh for better UX
4. **Caching:** Consider caching memo list locally
5. **Offline Support:** Store accepted memos locally, sync when online
6. **User Feedback:** Show success/error messages after actions
7. **Validation:** Validate data before sending to API
8. **Security:** Store user_id securely (don't hardcode)

---

## Additional Resources

- **Full API Documentation:** See `MOBILE_MEMO_ACCEPTANCE_API.md`
- **Setup Guide:** See `MOBILE_API_SETUP_GUIDE.md`
- **Backend Code:** See `backend/app/routers/mobile.py`

---

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review error messages in API responses
3. Test endpoints directly using Postman/curl
4. Check backend logs for server errors

---

## API Response Examples Summary

### Success Response Pattern
```json
{
  "data": [...],
  "status": 200
}
```

### Error Response Pattern
```json
{
  "detail": "Error message here"
}
```

---

## Quick Reference

| Action | Endpoint | Method | Key Parameters |
|--------|----------|--------|----------------|
| Get memos | `/assigned-memos` | GET | `skip`, `limit` |
| Accept memo | `/accept-memo` | POST | `memo_number`, `user_id` |
| Check status | `/loading-number/{ln}/status` | GET | `loading_number` (path) |
| My memos | `/my-accepted-memos` | GET | `user_id` (query) |

---

**Last Updated:** December 8, 2025  
**API Version:** 1.0.0

