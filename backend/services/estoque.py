from sqlalchemy.orm import Session
from models.item import Item
from models.lista_compras import ListaCompras

def checar_estoque_minimo_e_alertar(db: Session, item: Item) -> str | None:
    # 1. Checa se o item tem quantidade mínima e se o estoque atual está abaixo ou igual a ela
    if not item.quantidade_minima or item.quantidade > item.quantidade_minima:
        return None
        
    # 2. Se caiu aqui, o estoque tá baixo! Vamos ver se já tá na lista de compras
    item_na_lista = db.query(ListaCompras).filter(
        ListaCompras.item_id == item.id, 
        ListaCompras.status.in_(["pendente", "comprado"])
    ).first()
    
    # 3. Se não tiver na lista, a gente adiciona
    if not item_na_lista:
        novo_item_lista = ListaCompras(item_id=item.id, nome=item.nome, quantidade=1)
        db.add(novo_item_lista)
    
    # 4. Retorna a mensagem de alerta
    return f"Estoque abaixo do mínimo! Atual: {item.quantidade}, Mínimo: {item.quantidade_minima}"
