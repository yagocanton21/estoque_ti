from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.emprestimo import Emprestimo
from schemas.emprestimo import EmprestimoCreate, EmprestimoResponse
from datetime import datetime
from pydantic import BaseModel
from sqlalchemy import or_


class EmprestimosPaginadosResponse(BaseModel):
    total: int
    items: list[EmprestimoResponse]

router = APIRouter(prefix="/emprestimos", tags=["Empréstimos"])

@router.get("/", response_model=list[EmprestimoResponse])
def listar_emprestimos(db: Session = Depends(get_db)):
    return db.query(Emprestimo).all()


@router.get("/ativos/paginado", response_model=EmprestimosPaginadosResponse)
def listar_emprestimos_ativos_paginados(
    skip: int = 0,
    limit: int = 5,
    q: str | None = None,
    db: Session = Depends(get_db),
):
    consulta = db.query(Emprestimo).filter(Emprestimo.devolvido.is_(False))

    if q and q.strip():
        termo = f"%{q.strip()}%"
        consulta = consulta.filter(
            or_(
                Emprestimo.item_nome.ilike(termo),
                Emprestimo.pessoa.ilike(termo),
            )
        )

    total = consulta.count()
    items = (
        consulta
        .order_by(Emprestimo.data_emprestimo.desc(), Emprestimo.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return {"total": total, "items": items}

@router.post("/", response_model=EmprestimoResponse, status_code=201)
def registrar_emprestimo(emp: EmprestimoCreate, db: Session = Depends(get_db)):
    novo_emp = Emprestimo(**emp.model_dump())
    db.add(novo_emp)
    
    db.commit()
    db.refresh(novo_emp)

    return novo_emp

@router.put("/{id}/devolver", response_model=EmprestimoResponse)
def devolver_emprestimo(id: int, db: Session = Depends(get_db)):
    emp = db.query(Emprestimo).filter(Emprestimo.id == id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empréstimo não encontrado")
    
    if emp.devolvido:
        raise HTTPException(status_code=400, detail="Este item já foi devolvido")

    emp.devolvido = True
    emp.data_devolucao = datetime.utcnow()

    db.commit()
    db.refresh(emp)

    return emp
