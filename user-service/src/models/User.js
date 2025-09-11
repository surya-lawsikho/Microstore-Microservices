import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "User",
  tableName: "users",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid"
    },
    username: {
      type: "varchar",
      unique: true,
      nullable: false
    },
    passwordHash: {
      type: "varchar",
      nullable: false
    },
    role: {
      type: "varchar",
      nullable: false,
      default: "user"
    },
    refreshTokenHash: {
      type: "varchar",
      nullable: true
    },
    createdAt: {
      type: "timestamp",
      createDate: true
    },
    updatedAt: {
      type: "timestamp",
      updateDate: true
    }
  }
});