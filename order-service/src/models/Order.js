import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "Order",
  tableName: "orders",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid"
    },
    userId: {
      type: "varchar",
      nullable: false
    },
    items: {
      type: "json",
      nullable: false
    },
    total: {
      type: "decimal",
      precision: 10,
      scale: 2,
      nullable: false
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