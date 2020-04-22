import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Image {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: number;

    @Column("text")
    url: string;

    @Column("bigint")
    user: number;

    set(options: { url: string, user: number }) {
        this.url = options.url;
        this.user = options.user;
        return this;
    }
}