# YatraMitra Database Design

This document outlines the dual-database architecture for YatraMitra, combining the strengths of PostgreSQL for structured relational data and MongoDB for high-frequency messaging.

## PostgreSQL (Relational Data)
Used for core business logic, user management, and financial tracking where ACID compliance and complex joins are required.

### Key Entities
- **Users**: Stores profile information, interests, and authentication metadata.
- **Trips**: The central entity for travel planning. Linked to an organizer.
- **Trip Members**: Manages the many-to-many relationship between users and trips. Defines roles (Organizer vs. Member).
- **Expenses**: Tracks shared costs within a trip. Supports categorization for splitting bills.
- **Reviews**: Enables peer-to-peer trust through ratings after a trip is completed.

### Relationships
- `User` 1:N `Trips` (as Organizer)
- `Trip` M:N `User` (via `Trip Members`)
- `Trip` 1:N `Expenses`
- `User` 1:N `Reviews` (as Reviewer or Reviewee)

---

## MongoDB (Unstructured Data)
Used for the chat system to handle real-time messaging, attachments, and read receipts with low latency and high scalability.

### Chat Messages
- **Document-based**: Each message is a document containing sender info, content, and metadata.
- **Optimized for Reads**: Indexed by `channelId` and `timestamp` to quickly fetch chat history.
- **Flexible Attachments**: Easily stores arrays of media links without complex schema migrations.

---

## Data Flow
1. **Relational Actions**: Creating a trip, joining a group, or logging an expense happens in PostgreSQL.
2. **Real-time Interaction**: Chatting within a trip group uses MongoDB.
3. **Integration**: The `channelId` in MongoDB corresponds to the `trip_id` in PostgreSQL for group chats.
